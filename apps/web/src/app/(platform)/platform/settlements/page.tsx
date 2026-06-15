'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { getMe, getPlatformSettlements, approvePlatformSettlement, type AuthUser, type PlatformSettlement } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformSettlementsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settlements, setSettlements] = useState<PlatformSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadSettlements = async () => {
    setFetchError(null);
    try {
      const data = await getPlatformSettlements();
      setSettlements(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load settlements');
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          setError('Insufficient permissions. Platform Admin role required.');
          setLoading(false);
          return;
        }
        setUser(me);
        await loadSettlements();
      } catch {
        setError('Failed to load settlements.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await approvePlatformSettlement(id);
    } catch {
      // ignore
    }
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
  };

  const weiToTokensVal = (wei: string) => (Number(wei) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <CreditCard className="w-4 h-4" />
            <span>Platform Settlements</span>
          </h2>
          {user && (
            <div className="text-xs font-mono text-zinc-500">
              Logged in as: <strong className="text-zinc-950">{user.email}</strong>
            </div>
          )}
        </header>

        <main className="flex-1 p-8 max-w-5xl space-y-8">
          {error ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">Access Blocked</h3>
                <p className="text-xs text-zinc-500">{error}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Fetching settlements ledger...</span>
            </div>
          ) : (
            <>
              {fetchError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-mono p-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {fetchError}
                </div>
              )}

              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Pending & Settled Payouts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                        <th className="px-6 py-3 font-semibold">Event / Tenant</th>
                        <th className="px-6 py-3 font-semibold">Gross Revenue</th>
                        <th className="px-6 py-3 font-semibold">Commission</th>
                        <th className="px-6 py-3 font-semibold">Net Payout</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {settlements.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-xs font-mono text-zinc-400">
                            No settlement records yet. Payouts appear here after events generate revenue.
                          </td>
                        </tr>
                      )}
                      {settlements.map((settlement) => (
                        <tr key={settlement.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 space-y-0.5">
                            <div className="font-bold text-zinc-950 uppercase">{settlement.eventName}</div>
                            <div className="text-[10px] text-zinc-400 uppercase">{settlement.organisationName}</div>
                          </td>
                          <td className="px-6 py-4 text-zinc-500">{weiToTokensVal(settlement.grossRevenueWei)} tMSTC</td>
                          <td className="px-6 py-4 text-zinc-500 font-bold">{weiToTokensVal(settlement.commissionWei)} tMSTC</td>
                          <td className="px-6 py-4 font-bold text-zinc-950">{weiToTokensVal(settlement.netPayoutWei)} tMSTC</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                              settlement.status === 'completed'
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                : 'bg-white border-zinc-300 text-zinc-450'
                            }`}>
                              {settlement.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {settlement.status === 'pending' ? (
                              <button
                                onClick={() => handleApprove(settlement.id)}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase font-mono px-2 py-1.5 bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve Payout</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-400 italic">Settled on-chain</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
