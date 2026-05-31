import type { Request, Response } from 'express';
import {
  handleChainpayWebhook,
  handleGenericPaymentWebhook,
} from './payments.service.js';

export async function chainpayWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawOrderId = (req.query.order_id as string | undefined) ?? req.params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  if (!orderId) {
    res.status(400).send('missing order_id');
    return;
  }

  const result = await handleChainpayWebhook({ orderId, payload: req.body });
  if (!result.ok) {
    res.status(400).send(result.message ?? 'invalid');
    return;
  }

  res.status(200).send('*ok*');
}

export async function paymentsWebhookHandler(req: Request, res: Response): Promise<void> {
  const orderId = req.query.order_id as string | undefined;
  const provider = (req.query.provider as string | undefined) ?? 'generic';

  if (!orderId) {
    res.status(400).json({ success: false, error: 'order_id query param required' });
    return;
  }

  const result = await handleGenericPaymentWebhook({
    orderId,
    provider,
    payload: req.body,
    signature: req.header('x-webhook-signature') ?? undefined,
  });

  if (!result.ok) {
    res.status(400).json({ success: false, error: result.message ?? 'invalid' });
    return;
  }

  res.status(200).json({ success: true });
}
