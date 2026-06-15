'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertCircle
} from 'lucide-react';
import { getMe, getPlatformFraudAlerts, toggleWalletBlacklist, type AuthUser, type FraudAlert } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformFraudPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

        try {
          const data = await getPlatformFraudAlerts();
          setAlerts(data);
        } catch (err) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load fraud alerts');
        }
      } catch {
        setError('Failed to load fraud logs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBlacklist = async (wallet: string, currentStatus: boolean) => {
    try {
      await toggleWalletBlacklist(wallet, !currentStatus);
    } catch {
      // ignore
    }
    setAlerts(prev => prev.map(a => a.walletAddress === wallet ? { ...a, blacklisted: !currentStatus } : a));
  };

  const filteredAlerts = alerts.filter(a =>
    a.eventName.toLowerCase().includes(search.toLowerCase()) ||
    a.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
    a.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Fraud Alerts & Blacklisting</span>
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
              <span className="text-xs font-mono">Loading security metrics...</span>
            </div>
          ) : (
            <>
              {fetchError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-mono p-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {fetchError}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by wallet, event, or warning content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded pl-10 pr-4 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              {/* Alerts Log */}
              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Live Warning Events Feed</h3>
                  <span className="text-[10px] font-mono bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
                    Security Active
                  </span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center text-xs font-mono text-zinc-400">
                      {alerts.length === 0
                        ? 'No unresolved fraud alerts. Security events will appear here when detected.'
                        : 'No security alerts match current filter.'}
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <div key={alert.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-50/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase ${
                              alert.severity === 'high'
                                ? 'bg-red-50 border-red-150 text-red-700'
                                : 'bg-amber-50 border-amber-150 text-amber-700'
                            }`}>
                              {alert.severity} severity
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="text-xs font-mono font-bold text-zinc-900 uppercase">
                            {alert.eventName} · Ticket {alert.ticketId}
                          </h4>
                          <p className="text-xs text-zinc-600 font-mono">{alert.message}</p>
                          <code className="block text-[10px] text-zinc-400 font-mono select-all bg-zinc-50 px-1 py-0.5 rounded inline-block">
                            WALLET: {alert.walletAddress}
                          </code>
                        </div>

                        <button
                          onClick={() => handleBlacklist(alert.walletAddress, alert.blacklisted)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase border transition-colors ${
                            alert.blacklisted
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-650 hover:bg-zinc-200'
                              : 'bg-zinc-950 border-zinc-950 text-white hover:bg-zinc-800'
                          }`}
                        >
                          {alert.blacklisted ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Whitelist Wallet</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Blacklist Wallet</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
