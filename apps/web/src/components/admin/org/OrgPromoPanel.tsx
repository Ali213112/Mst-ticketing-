'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, AlertCircle, Ban } from 'lucide-react';
import {
  getMe,
  getAdminPromoCodes,
  createAdminPromoCode,
  updateAdminPromoCode,
  type PromoCodeSummary,
} from '@/lib/api';

export function OrgPromoPanel() {
  const [promos, setPromos] = useState<PromoCodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_wei'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Admin access required.');
          return;
        }
        const data = await getAdminPromoCodes();
        setPromos(data);
      } catch {
        setError('Failed to load promo codes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!code.trim() || !discountValue.trim()) return;
    setSaving(true);
    try {
      const promo = await createAdminPromoCode({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: discountType === 'percentage'
          ? String(Math.round(parseFloat(discountValue) * 100))
          : discountValue,
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      });
      setPromos((prev) => [promo, ...prev]);
      setShowForm(false);
      setCode('');
      setDiscountValue('');
      setMaxUses('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create promo');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (promo: PromoCodeSummary) => {
    const next = promo.status === 'active' ? 'disabled' : 'active';
    try {
      await updateAdminPromoCode(promo.id, { status: next });
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, status: next } : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const formatDiscount = (p: PromoCodeSummary) => {
    if (p.discountType === 'percentage') {
      return `${(Number(p.discountValue) / 100).toFixed(0)}% off`;
    }
    return `${Number(p.discountValue) / 1e18} tMSTC off`;
  };

  return (
    <>
      <div className="space-y-6">
        {error ? (
          <div className="bg-paper border border-mist rounded p-12 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        ) : loading ? (
          <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-400">Loading…</div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-xs text-zinc-500 font-mono">{promos.length} code(s)</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded"
              >
                <Plus className="w-3.5 h-3.5" />
                New code
              </button>
            </div>

            {promos.length === 0 ? (
              <div className="bg-paper border border-dashed border-mist rounded p-12 text-center text-xs font-mono text-zinc-400">
                No promo codes yet.
              </div>
            ) : (
              <div className="bg-paper border border-mist rounded overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Code</th>
                      <th className="text-left px-4 py-2">Discount</th>
                      <th className="text-left px-4 py-2">Uses</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-100">
                        <td className="px-4 py-3 font-bold">{p.code}</td>
                        <td className="px-4 py-3">{formatDiscount(p)}</td>
                        <td className="px-4 py-3">
                          {p.usesRemaining != null ? `${p.usesRemaining} left` : '∞'}
                        </td>
                        <td className="px-4 py-3 capitalize">{p.status}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleStatus(p)}
                            className="text-zinc-400 hover:text-zinc-900"
                            title={p.status === 'active' ? 'Disable' : 'Enable'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper rounded-lg border border-mist w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-mono font-bold text-sm">New promo code</h3>
                <button type="button" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                placeholder="CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono uppercase"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed_wei')}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed_wei">Fixed tMSTC off</option>
              </select>
              <input
                placeholder={discountType === 'percentage' ? 'Percent (e.g. 10)' : 'Wei amount'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <input
                placeholder="Max uses (optional)"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCreate()}
                className="w-full py-2 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
