'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, Ticket, ArrowRight, AlertCircle } from 'lucide-react';
import { getOrder, type TicketOrderSummary } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { ContractExplorerLink } from '@/components/blockchain/ContractExplorerLink';

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
    return (
      <div className="text-center space-y-2">
        <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
        <p className="text-xs font-mono text-zinc-500">Missing order_id in URL.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-2">
        <XCircle className="w-8 h-8 mx-auto text-red-500" />
        <p className="text-xs font-mono text-red-600">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-xs font-mono text-zinc-500">Loading order status…</p>
      </div>
    );
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

  const isComplete = order.status === 'completed';
  const isFailed = order.status === 'failed' || order.status === 'expired';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded p-8 space-y-6 text-center"
    >
      {isComplete ? (
        <CheckCircle2 className="w-14 h-14 mx-auto text-zinc-900" />
      ) : isFailed ? (
        <XCircle className="w-14 h-14 mx-auto text-red-500" />
      ) : (
        <Loader2 className="w-14 h-14 mx-auto text-zinc-400 animate-spin" />
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Status</p>
        <p className="text-lg font-bold font-mono uppercase text-zinc-950">{order.status}</p>
        <p className="text-sm text-zinc-600">{statusMessages[order.status] ?? 'Processing…'}</p>
      </div>

      <div className="text-xs font-mono text-zinc-500 space-y-1 border-t border-zinc-100 pt-4">
        <p>Order {order.id.slice(0, 8)}…</p>
        <p>{order.currency} {order.amountFiat.toLocaleString()} · qty {order.quantity}</p>
        {order.transactionHash && (
          <p className="break-all text-[10px] text-zinc-400 flex items-start justify-center gap-1">
            <span>Tx: {order.transactionHash}</span>
            <ContractExplorerLink
              value={order.transactionHash}
              type="tx"
              stopPropagation={false}
            />
          </p>
        )}
      </div>

      {isComplete && (
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded hover:bg-zinc-800"
        >
          <Ticket className="w-4 h-4" />
          View my tickets
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </motion.div>
  );
}

export default function TicketSuccessPage() {
  return (
    <>
      <Navbar />
      <div className="bg-zinc-50 min-h-[calc(100vh-4rem)] py-16 px-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-950">Payment status</h1>
            <Link href="/events" className="text-xs font-mono text-zinc-500 hover:text-zinc-900">
              ← Browse events
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="text-center py-8 text-xs font-mono text-zinc-400">Loading…</div>
            }
          >
            <OrderStatusContent />
          </Suspense>
        </div>
      </div>
    </>
  );
}
