'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Receipt,
  Download,
  AlertCircle,
} from 'lucide-react';
import { getMe, getAdminEarnings, getAdminEvents, getAdminOrganisation, type AdminEarnings, type AdminEventSummary, type AdminOrgDetails } from '@/lib/api';
import { ContractExplorerLink } from '@/components/blockchain/ContractExplorerLink';
import { getAddressExplorerUrl, getTxExplorerUrl, isExplorableAddress, isExplorableTxHash } from '@/lib/blockchain';

const weiToToken = (wei: string) => (Number(wei) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ExplorerTxLink({ hash }: { hash: string }) {
  if (!isExplorableTxHash(hash)) {
    return <span className="text-zinc-400">{hash}</span>;
  }
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  return (
    <a
      href={getTxExplorerUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      title="View transaction on MST Scan"
      className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-950 hover:underline"
    >
      <span className="truncate max-w-[160px]">{short}</span>
      <ContractExplorerLink value={hash} type="tx" stopPropagation={false} />
    </a>
  );
}

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

export function OrgFinancePanel() {
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
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

        const [orgData, earningsData, eventsData] = await Promise.all([
          getAdminOrganisation().catch(() => null),
          getAdminEarnings().catch(() => MOCK_EARNINGS),
          getAdminEvents().catch(() => [] as AdminEventSummary[]),
        ]);

        setOrg(orgData);
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
    <div className="space-y-8">
      {error ? (
        <div className="bg-paper border border-mist rounded p-12 text-center max-w-md mx-auto space-y-4">
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
          {org?.superAdminWalletAddress && isExplorableAddress(org.superAdminWalletAddress) && (
            <div className="bg-paper border border-mist rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Payout wallet
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Track settlements on MST Scan</p>
              </div>
              <a
                href={getAddressExplorerUrl(org.superAdminWalletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                title="Track payout wallet on MST Scan"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-800 hover:text-zinc-950 hover:underline"
              >
                <span>{org.superAdminWalletAddress}</span>
                <ContractExplorerLink
                  value={org.superAdminWalletAddress}
                  type="address"
                  stopPropagation={false}
                />
              </a>
            </div>
          )}

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
                  className="bg-paper border border-mist rounded p-6 space-y-2"
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

          {events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-paper border border-mist rounded overflow-hidden"
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
                      <th className="px-6 py-3 font-semibold">Contract</th>
                      <th className="px-6 py-3 font-semibold">Tickets Sold</th>
                      <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {events.map((e) => (
                      <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-950 uppercase">{e.name}</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date(e.eventDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {e.contractAddress ? (
                            <a
                              href={getAddressExplorerUrl(e.contractAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Track event contract on MST Scan"
                              className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950 hover:underline"
                            >
                              <span className="font-mono text-[10px]">{truncateAddress(e.contractAddress)}</span>
                              <ContractExplorerLink
                                value={e.contractAddress}
                                type="address"
                                stopPropagation={false}
                              />
                            </a>
                          ) : (
                            <span className="text-zinc-400">Not deployed</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">{e.totalTicketsSold}</td>
                        <td className="px-6 py-4 text-zinc-950 text-right font-bold">
                          {weiToToken(e.totalRevenueWei ?? '0')} tMSTC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-paper border border-mist rounded overflow-hidden"
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
                      <td className="px-6 py-4">
                        <ExplorerTxLink hash={payout.txHash} />
                      </td>
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
    </div>
  );
}
