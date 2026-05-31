import { env } from '../../config/env.js';

export interface ChainpayPaymentRequest {
  value: number;
  description?: string;
  redirectUrl: string;
  notifyUrl?: string;
}

export interface ChainpayPaymentResponse {
  token: string;
  successToken: string;
  paymentUrl: string;
}

function getChainpayApiUrl(): string {
  return env.CHAINPAY_API_URL;
}

function chainpayConfigured(): boolean {
  return Boolean(env.CHAINPAY_API_KEY);
}

export async function createChainpayPayment(
  params: ChainpayPaymentRequest
): Promise<ChainpayPaymentResponse> {
  if (!chainpayConfigured()) {
    throw new Error('CHAINPAY_API_KEY is not configured');
  }

  const response = await fetch(`${getChainpayApiUrl()}/payments/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CHAINPAY_API_KEY}`,
      'X-API-Key': env.CHAINPAY_API_KEY!,
    },
    body: JSON.stringify({
      value: params.value,
      description: params.description,
      redirectUrl: params.redirectUrl,
      ...(params.notifyUrl ? { notifyUrl: params.notifyUrl } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ChainPay payment request failed: ${detail}`);
  }

  const data = (await response.json()) as ChainpayPaymentResponse;
  if (!data.paymentUrl || !data.successToken) {
    throw new Error('ChainPay returned an invalid payment response');
  }
  return data;
}

export function resolveChainpayNotifyUrl(orderId: string, apiBaseUrl: string): string | undefined {
  try {
    const url = new URL(`/api/webhooks/chainpay?order_id=${orderId}`, apiBaseUrl);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function extractSuccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.successToken === 'string') return obj.successToken;
  if (typeof obj.success_token === 'string') return obj.success_token;
  return null;
}
