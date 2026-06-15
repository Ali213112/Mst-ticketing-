'use client';

import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, Check, X } from 'lucide-react';
import { getMe, getPlatformRefunds, reviewPlatformRefund, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformRefundsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [refunds, setRefunds] = useState<Awaited<ReturnType<typeof getPlatformRefunds>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setRefunds(await getPlatformRefunds());
  };

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          setError('Platform admin required.');
          return;
        }
        setUser(me);
        await load();
      } catch {
        setError('Failed to load refunds.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      await reviewPlatformRefund(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            Refund review
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>
        <main className="flex-1 p-8 max-w-5xl space-y-4">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 mt-2">{error}</p>
            </div>
          ) : loading ? (
            <div className="text-xs font-mono text-zinc-400 text-center py-12">Loading…</div>
          ) : refunds.length === 0 ? (
            <div className="bg-white border border-dashed border-zinc-200 rounded p-12 text-center text-xs font-mono text-zinc-400">
              No refund requests pending.
            </div>
          ) : (
            refunds.map((r) => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded p-4 flex justify-between items-start gap-4">
                <div className="space-y-1 text-xs font-mono">
                  <p className="font-bold text-zinc-950">{r.eventName}</p>
                  <p className="text-zinc-500">{r.orgName}</p>
                  <p>Amount: {r.refundAmountWei} wei</p>
                  {r.refundReason && <p className="text-zinc-400">Reason: {r.refundReason}</p>}
                  <p className="capitalize">Status: {r.status}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void handleReview(r.id, 'approve')}
                      className="p-2 bg-zinc-900 text-white rounded hover:bg-zinc-800"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void handleReview(r.id, 'reject')}
                      className="p-2 border border-zinc-200 rounded hover:bg-zinc-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
