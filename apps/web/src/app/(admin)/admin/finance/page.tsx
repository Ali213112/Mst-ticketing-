'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Receipt,
  Download,
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';
import { getMe, getAdminEarnings, getAdminEvents, type AuthUser, type AdminEarnings, type AdminEventSummary } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

const weiToToken = (wei: string) => (Number(wei) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

interface PayoutRecord {
  id: string;
  date: string;
  amount: string;
  txHash: string;
  status: 'completed' | 'pending';
}

const MOCK_PAYOUTS: PayoutRecord[] = [
  { id: 'p-1', date: '2025-05-20T10:00:00Z', amount: '500000000000000000', txHash: '0xabc...def1', status: 'completed' },
  { id: 'p-2', date: '2025-05-15T14:00:00Z', amount: '320000000000000000', txHash: '0xabc...def2', status: 'completed' },
  { id: 'p-3', date: '2025-05-28T08:00:00Z', amount: '180000000000000000', txHash: '—', status: 'pending' },
];

const MOCK_EARNINGS: AdminEarnings = {
  grossRevenueWei: '2500000000000000000',
  commissionWei: '50000000000000000',
  refundsWei: '10000000000000000',
  netPayoutWei: '2440000000000000000',
};

export default function AdminFinancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [earnings, setEarnings] = useState<AdminEarnings | null>(null);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [payouts] = useState<PayoutRecord[]>(MOCK_PAYOUTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Insufficient permissions. Admin role required.');
          setLoading(false);
          return;
        }
        setUser(me);

        const [earningsData, eventsData] = await Promise.all([
          getAdminEarnings().catch(() => MOCK_EARNINGS),
          getAdminEvents().catch(() => [] as AdminEventSummary[]),
        ]);

        setEarnings(earningsData);
        setEvents(eventsData);
      } catch {
        setError('Failed to load finance data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <CreditCard className="w-4 h-4" />
            <span>Finance & Settlements</span>
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
              <span className="text-xs font-mono">Loading finance data...</span>
            </div>
          ) : earnings && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Gross Revenue', value: weiToToken(earnings.grossRevenueWei), icon: TrendingUp, suffix: 'tMSTC' },
                  { label: 'Commission Fees', value: weiToToken(earnings.commissionWei), icon: Receipt, suffix: 'tMSTC' },
                  { label: 'Refunds', value: weiToToken(earnings.refundsWei), icon: TrendingDown, suffix: 'tMSTC' },
                  { label: 'Net Payout', value: weiToToken(earnings.netPayoutWei), icon: ArrowDownToLine, suffix: 'tMSTC' },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white border border-zinc-200 rounded p-6 space-y-2"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                        <Icon className="w-3.5 h-3.5" /><span>{kpi.label}</span>
                      </span>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-bold font-mono text-zinc-950">{kpi.value}</span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">{kpi.suffix}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Revenue by Event */}
              {events.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-zinc-200 rounded overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Revenue by Event</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                          <th className="px-6 py-3 font-semibold">Event</th>
                          <th className="px-6 py-3 font-semibold">Date</th>
                          <th className="px-6 py-3 font-semibold">Tickets Sold</th>
                          <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {events.map((e) => (
                          <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-zinc-950 uppercase">{e.name}</td>
                            <td className="px-6 py-4 text-zinc-500">{new Date(e.eventDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-zinc-500">{e.totalTicketsSold}</td>
                            <td className="px-6 py-4 text-zinc-950 text-right font-bold">
                              {weiToToken(e.totalRevenueWei)} tMSTC
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Payout History */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border border-zinc-200 rounded overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Payout History</h3>
                  <button className="flex items-center space-x-1 text-[10px] font-mono font-bold text-zinc-600 hover:text-zinc-900 transition-colors">
                    <Download className="w-3 h-3" />
                    <span>Export CSV</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Amount</th>
                        <th className="px-6 py-3 font-semibold">Tx Hash</th>
                        <th className="px-6 py-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 text-zinc-500">
                            {new Date(payout.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-950">
                            {weiToToken(payout.amount)} tMSTC
                          </td>
                          <td className="px-6 py-4 text-zinc-500">{payout.txHash}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                              payout.status === 'completed'
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                : 'bg-white border-zinc-300 text-zinc-400'
                            }`}>
                              {payout.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
