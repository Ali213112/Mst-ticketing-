'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard, Coins, AlertCircle, Plus, Minus, Loader2 } from 'lucide-react';
import { createCheckout, getMe, mintTickets, type TierResponse } from '@/lib/api';
import { newIdempotencyKey } from '@/lib/idempotency';

const allowDirectMint = process.env.NEXT_PUBLIC_ALLOW_DIRECT_MINT !== 'false';

interface TierPurchaseProps {
  tier: TierResponse;
  currency?: string;
}

export function TierPurchase({ tier, currency = 'INR' }: TierPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState<'chainpay' | 'mint' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = tier.totalSupply - tier.minted;
  const soldOut = tier.status === 'sold_out' || remaining <= 0;
  const canCheckout = tier.priceDisplay !== null && tier.priceDisplay > 0;
  const maxBuyable = Math.min(tier.maxPerWallet, remaining, 10);

  async function ensureLoggedIn(): Promise<boolean> {
    const me = await getMe();
    if (me) return true;
    setError('Please sign in to buy tickets.');
    return false;
  }

  async function handleChainpayCheckout() {
    if (!canCheckout) {
      setError('This tier is not configured for fiat checkout.');
      return;
    }
    if (!(await ensureLoggedIn())) return;

    setLoading('chainpay');
    setError(null);
    try {
      const checkout = await createCheckout({
        tierId: tier.id,
        quantity,
        paymentMethod: 'chainpay',
        idempotencyKey: newIdempotencyKey('checkout'),
      });
      window.location.href = checkout.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(null);
    }
  }

  async function handleDirectMint() {
    if (!(await ensureLoggedIn())) return;

    setLoading('mint');
    setError(null);
    try {
      const result = await mintTickets({
        tierId: tier.id,
        quantity,
        idempotencyKey: newIdempotencyKey('mint'),
      });
      window.location.href = `/tickets?minted=${result.tickets.length}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setLoading(null);
    }
  }

  const incrementQty = () => {
    setQuantity(prev => Math.min(prev + 1, maxBuyable));
  };

  const decrementQty = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-200 rounded p-6 space-y-4 hover:border-zinc-400 transition-colors"
    >
      {/* Tier Title & Price */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-bold font-mono text-zinc-950 text-base uppercase tracking-tight">
            {tier.name}
          </h3>
          {tier.description && (
            <p className="text-xs text-zinc-500 max-w-md">{tier.description}</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold font-mono text-zinc-900">
            {canCheckout
              ? `${currency} ${tier.priceDisplay!.toLocaleString()}`
              : `${Number(tier.priceWei) / 1e18} tMSTC`}
          </span>
          <p className="text-[10px] text-zinc-400 font-mono">per ticket</p>
        </div>
      </div>

      {/* Availability info */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-mono bg-zinc-50 p-2.5 rounded border border-zinc-100">
        <span>STATUS: {soldOut ? 'SOLD OUT' : 'AVAILABLE'}</span>
        <span>
          {soldOut ? '0 Left' : `${remaining} of ${tier.totalSupply} Remaining`}
        </span>
        {!soldOut && <span>MAX: {tier.maxPerWallet} / user</span>}
      </div>

      {/* Selection Actions */}
      {!soldOut && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Quantity Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-medium text-zinc-500 uppercase">Quantity:</span>
            <div className="flex items-center border border-zinc-200 rounded overflow-hidden bg-white">
              <button
                type="button"
                onClick={decrementQty}
                disabled={quantity <= 1 || loading !== null}
                className="p-1.5 hover:bg-zinc-100 disabled:opacity-50 text-zinc-600 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 font-mono text-sm text-zinc-900 min-w-[32px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={incrementQty}
                disabled={quantity >= maxBuyable || loading !== null}
                className="p-1.5 hover:bg-zinc-100 disabled:opacity-50 text-zinc-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {canCheckout ? (
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleChainpayCheckout()}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded text-xs font-mono font-semibold tracking-wider uppercase transition-colors"
              >
                {loading === 'chainpay' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay with ChainPay</span>
                  </>
                )}
              </button>
            ) : null}

            {allowDirectMint && (
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleDirectMint()}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 rounded text-xs font-mono font-semibold tracking-wider uppercase transition-colors"
              >
                {loading === 'mint' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Minting...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    <span>On-chain Mint</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Errors & Alerts */}
      {error && (
        <div className="flex items-start space-x-2 bg-red-50 text-red-700 p-3 rounded text-xs border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{error}</p>
            {error.includes('sign in') && (
              <Link href="/login" className="underline font-semibold block text-[10px] uppercase font-mono tracking-wider">
                Go to Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
