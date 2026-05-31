import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  createChainpayPayment,
  extractSuccessToken,
  resolveChainpayNotifyUrl,
} from '../../shared/payments/chainpay.service.js';
import { findEventById } from '../event/event.repository.js';
import {
  createTicketOrder,
  findOrderById,
  findOrderByIdForUser,
  findOrderByIdempotencyKey,
  getTierPricing,
  markOrderCompleted,
  markOrderExpired,
  markOrderFailed,
  markOrderPaid,
  updateOrderChainpayDetails,
} from './payment.repository.js';
import {
  fulfillLazyMint,
  purchaseBodySchema,
  restoreTierAvailability,
  validatePurchase,
} from './purchase.service.js';

const checkoutBodySchema = purchaseBodySchema.extend({
  paymentMethod: z.enum(['chainpay', 'fiat_gateway']).default('chainpay'),
});

const ORDER_TTL_MS = 30 * 60 * 1000;

function resolveFiatAmount(tier: NonNullable<Awaited<ReturnType<typeof getTierPricing>>>): number | null {
  if (tier.priceDisplay !== null && tier.priceDisplay > 0) return tier.priceDisplay;
  return null;
}

export async function createCheckout(params: {
  userId: string;
  idempotencyKey: string;
  body: unknown;
}): Promise<
  | {
      orderId: string;
      paymentUrl: string;
      amountFiat: number;
      currency: string;
      expiresAt: string;
      paymentMethod: 'chainpay' | 'fiat_gateway';
    }
  | { error: string; status: number; code?: string }
> {
  const parsed = checkoutBodySchema.safeParse(params.body);
  if (!parsed.success) {
    return { error: 'Invalid checkout request', status: 400, code: 'VALIDATION_ERROR' };
  }

  const { tierId, quantity, paymentMethod } = parsed.data;

  const existingOrder = await findOrderByIdempotencyKey(params.idempotencyKey);
  if (existingOrder) {
    if (existingOrder.status === 'pending' || existingOrder.status === 'paid') {
      const order = await findOrderById(existingOrder.id);
      if (order?.paymentUrl) {
        return {
          orderId: order.id,
          paymentUrl: order.paymentUrl,
          amountFiat: order.amountFiat,
          currency: order.currency,
          expiresAt: order.expiresAt,
          paymentMethod: order.paymentMethod as 'chainpay' | 'fiat_gateway',
        };
      }
    }
    if (existingOrder.status === 'completed') {
      return { error: 'Order already completed', status: 409, code: 'ORDER_COMPLETED' };
    }
  }

  const tier = await getTierPricing(tierId);
  if (!tier) return { error: 'Tier not found', status: 404 };

  const amountFiat = resolveFiatAmount(tier);
  if (amountFiat === null) {
    return {
      error: 'Tier price_display must be set for payment checkout',
      status: 400,
      code: 'PRICE_NOT_CONFIGURED',
    };
  }

  const validation = await validatePurchase({
    userId: params.userId,
    tierId,
    quantity,
  });
  if (!validation.ok) {
    return { error: validation.error, status: validation.status, code: validation.code };
  }

  const event = await findEventById(tier.eventId);
  const expiresAt = new Date(Date.now() + ORDER_TTL_MS);
  const totalAmount = amountFiat * quantity;
  const currency = env.CHAINPAY_DEFAULT_CURRENCY;

  const order = await createTicketOrder({
    userId: params.userId,
    eventId: tier.eventId,
    tierId,
    quantity,
    amountFiat: totalAmount,
    currency,
    paymentProvider: paymentMethod === 'chainpay' ? 'chainpay' : 'direct',
    paymentMethod,
    idempotencyKey: params.idempotencyKey,
    expiresAt,
    inventoryReserved: true,
    metadata: { tierName: tier.name, eventName: event?.name },
  });

  if (paymentMethod === 'chainpay') {
    if (!env.CHAINPAY_API_KEY) {
      await markOrderFailed(order.id, 'ChainPay not configured');
      await restoreTierAvailability(tierId, quantity);
      return { error: 'ChainPay is not configured', status: 503, code: 'PAYMENT_UNAVAILABLE' };
    }

    try {
      const redirectUrl = `${env.FRONTEND_URL}/tickets/success?order_id=${order.id}`;
      const notifyUrl = resolveChainpayNotifyUrl(order.id, env.API_BASE_URL);

      const chainpay = await createChainpayPayment({
        value: totalAmount,
        description: `${event?.name ?? 'Event'} — ${tier.name} x${quantity}`,
        redirectUrl,
        notifyUrl,
      });

      await updateOrderChainpayDetails(order.id, {
        providerToken: chainpay.token,
        providerSuccessToken: chainpay.successToken,
        paymentUrl: chainpay.paymentUrl,
      });

      return {
        orderId: order.id,
        paymentUrl: chainpay.paymentUrl,
        amountFiat: totalAmount,
        currency,
        expiresAt: expiresAt.toISOString(),
        paymentMethod: 'chainpay',
      };
    } catch (error) {
      await markOrderFailed(order.id, error instanceof Error ? error.message : 'ChainPay failed');
      await restoreTierAvailability(tierId, quantity);
      return {
        error: error instanceof Error ? error.message : 'Payment provider error',
        status: 502,
        code: 'PAYMENT_INIT_FAILED',
      };
    }
  }

  return {
    error: 'Fiat gateway integration coming soon — use chainpay or direct mint in development',
    status: 501,
    code: 'FIAT_GATEWAY_NOT_IMPLEMENTED',
  };
}

export async function getOrderStatus(userId: string, orderId: string) {
  await expireOrderIfNeeded(orderId);
  const order = await findOrderByIdForUser(orderId, userId);
  if (!order) return { error: 'Order not found', status: 404 as const };
  return { order };
}

async function expireOrderIfNeeded(orderId: string): Promise<void> {
  const order = await findOrderById(orderId);
  if (!order || order.status !== 'pending') return;
  if (new Date(order.expiresAt).getTime() > Date.now()) return;

  const expired = await markOrderExpired(orderId);
  if (expired && order.inventoryReserved) {
    await restoreTierAvailability(order.tierId, order.quantity);
  }
}

export async function handleChainpayWebhook(params: {
  orderId: string;
  payload: unknown;
}): Promise<{ ok: boolean; message?: string }> {
  const order = await findOrderById(params.orderId);
  if (!order) return { ok: false, message: 'Order not found' };

  if (order.status === 'completed') {
    return { ok: true };
  }

  if (order.status === 'expired' || order.status === 'cancelled' || order.status === 'failed') {
    return { ok: false, message: 'Order is not payable' };
  }

  const successToken = extractSuccessToken(params.payload);
  if (!successToken || !order.providerSuccessToken || successToken !== order.providerSuccessToken) {
    return { ok: false, message: 'Invalid success token' };
  }

  if (order.status === 'pending') {
    await markOrderPaid(params.orderId);
  }

  void fulfillOrderInBackground(params.orderId);
  return { ok: true };
}

export async function handleGenericPaymentWebhook(params: {
  orderId: string;
  provider: string;
  payload: unknown;
  signature?: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (params.provider === 'chainpay') {
    return handleChainpayWebhook({ orderId: params.orderId, payload: params.payload });
  }

  if (!env.PAYMENTS_WEBHOOK_SECRET) {
    return { ok: false, message: 'Payment webhook secret not configured' };
  }

  const order = await findOrderById(params.orderId);
  if (!order) return { ok: false, message: 'Order not found' };

  const payloadStatus =
    params.payload && typeof params.payload === 'object'
      ? (params.payload as Record<string, unknown>).status
      : undefined;

  if (payloadStatus !== 'paid' && payloadStatus !== 'success') {
    return { ok: false, message: 'Payment not confirmed' };
  }

  if (order.status === 'pending') {
    await markOrderPaid(params.orderId);
  }

  void fulfillOrderInBackground(params.orderId);
  return { ok: true };
}

async function fulfillOrderInBackground(orderId: string): Promise<void> {
  try {
    const order = await findOrderById(orderId);
    if (!order) return;
    if (order.status === 'completed') return;

    const result = await fulfillLazyMint({
      userId: order.userId,
      tierId: order.tierId,
      quantity: order.quantity,
      idempotencyKey: order.idempotencyKey,
      orderId: order.id,
    });

    if ('error' in result) {
      await markOrderFailed(orderId, result.error);
      if (order.inventoryReserved) {
        await restoreTierAvailability(order.tierId, order.quantity);
      }
      return;
    }

    await markOrderCompleted(orderId, result.transactionHash);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment failed';
    await markOrderFailed(orderId, message);
  }
}

export { checkoutBodySchema, purchaseBodySchema };
