'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getOrder, type TicketOrderSummary } from '@/lib/api';

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<TicketOrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function poll() {
      try {
        const result = await getOrder(orderId!);
        if (cancelled) return;
        if (!result) {
          setError('Order not found');
          return;
        }
        setOrder(result);

        if (result.status === 'completed' || result.status === 'failed' || result.status === 'expired') {
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setError('Could not load order status');
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) {
    return <p>Missing order_id in URL.</p>;
  }

  if (error) {
    return <p style={{ color: '#c00' }}>{error}</p>;
  }

  if (!order) {
    return <p>Loading order status…</p>;
  }

  const statusMessages: Record<string, string> = {
    pending: 'Payment pending — complete checkout on ChainPay if you have not already.',
    paid: 'Payment received. Minting your ticket on-chain…',
    minting: 'Minting your ticket on-chain…',
    completed: 'Your ticket has been minted successfully.',
    failed: 'Order failed. Contact support if you were charged.',
    expired: 'This checkout session expired. Please start a new purchase.',
    cancelled: 'Order was cancelled.',
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <p>
        <strong>Status:</strong> {order.status}
      </p>
      <p>{statusMessages[order.status] ?? 'Processing…'}</p>
      <p style={{ fontSize: '0.875rem', color: '#555' }}>
        Order {order.id} · {order.currency} {order.amountFiat.toLocaleString()} · qty {order.quantity}
      </p>
      {order.transactionHash && (
        <p style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}>
          Tx: {order.transactionHash}
        </p>
      )}
      {order.status === 'completed' && (
        <p>
          <Link href="/tickets">View my tickets</Link>
        </p>
      )}
    </div>
  );
}

export default function TicketSuccessPage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 640 }}>
      <p>
        <Link href="/events">← Browse events</Link>
      </p>
      <h1>Payment status</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <OrderStatusContent />
      </Suspense>
    </main>
  );
}
