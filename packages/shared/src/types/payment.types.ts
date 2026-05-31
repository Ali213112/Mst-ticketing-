export type PaymentProvider = 'chainpay' | 'direct';
export type PaymentMethod = 'chainpay' | 'crypto_direct' | 'fiat_gateway';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'minting'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface TicketOrderSummary {
  id: string;
  eventId: string;
  tierId: string;
  quantity: number;
  amountFiat: number;
  currency: string;
  paymentProvider: PaymentProvider;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentUrl: string | null;
  transactionHash: string | null;
  expiresAt: string;
  paidAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CheckoutResponse {
  orderId: string;
  paymentUrl: string;
  amountFiat: number;
  currency: string;
  expiresAt: string;
  paymentMethod: PaymentMethod;
}
