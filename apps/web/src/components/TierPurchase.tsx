'use client';

import { useState } from 'react';
import Link from 'next/link';
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

  async function ensureLoggedIn(): Promise<boolean> {
    const me = await getMe();
    if (me) return true;
    setError('Please sign in before purchasing tickets.');
    return false;
  }

  async function handleChainpayCheckout() {
    if (!canCheckout) {
      setError('This tier is not available for fiat checkout (price not configured).');
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

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '1rem',
        display: 'grid',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{tier.name}</strong>
        <span>
          {canCheckout
            ? `${currency} ${tier.priceDisplay!.toLocaleString()}`
            : `${Number(tier.priceWei) / 1e18} tMSTC`}
        </span>
      </div>

      {tier.description && (
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>{tier.description}</p>
      )}

      <p style={{ margin: 0, fontSize: '0.875rem' }}>
        {soldOut ? 'Sold out' : `${remaining} remaining · max ${tier.maxPerWallet} per wallet`}
      </p>

      {!soldOut && (
        <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
          Quantity
          <input
            type="number"
            min={1}
            max={Math.min(tier.maxPerWallet, remaining, 10)}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={loading !== null}
            style={{ width: 80 }}
          />
        </label>
      )}

      {!soldOut && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={loading !== null || !canCheckout}
            onClick={() => void handleChainpayCheckout()}
          >
            {loading === 'chainpay' ? 'Redirecting…' : 'Pay with ChainPay'}
          </button>

          {allowDirectMint && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void handleDirectMint()}
              style={{ background: '#f5f5f5' }}
            >
              {loading === 'mint' ? 'Minting…' : 'Mint on-chain (dev)'}
            </button>
          )}
        </div>
      )}

      {!canCheckout && !soldOut && (
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#666' }}>
          Fiat checkout unavailable — use on-chain mint in development.
        </p>
      )}

      {error && (
        <p style={{ margin: 0, color: '#c00', fontSize: '0.875rem' }}>
          {error}{' '}
          {error.includes('sign in') && (
            <Link href="/login">Sign in</Link>
          )}
        </p>
      )}
    </div>
  );
}
