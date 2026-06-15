'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Search,
  AlertCircle
} from 'lucide-react';
import { getMe, getPlatformAuditLogs, type AuthUser, type AuditLog } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformAuditPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
          const data = await getPlatformAuditLogs();
          setLogs(data);
        } catch (err) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load audit logs');
        }
      } catch {
        setError('Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <History className="w-4 h-4" />
            <span>Audit Trail Ledger</span>
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
              <span className="text-xs font-mono">Fetching platform audit trail...</span>
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
                  placeholder="Filter logs by action, user ID, details..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded pl-10 pr-4 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
                />
              </div>

              {/* Table Ledger */}
              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                        <th className="px-6 py-3 font-semibold">Timestamp</th>
                        <th className="px-6 py-3 font-semibold">User</th>
                        <th className="px-6 py-3 font-semibold">Action</th>
                        <th className="px-6 py-3 font-semibold">IP Address</th>
                        <th className="px-6 py-3 font-semibold text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-xs font-mono text-zinc-400">
                            {logs.length === 0
                              ? 'No audit log entries yet. Platform actions will be recorded here.'
                              : 'No audit logs match current filter.'}
                          </td>
                        </tr>
                      )}
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 text-zinc-550">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-zinc-500">{log.userId}</td>
                          <td className="px-6 py-4">
                            <span className="px-1.5 py-0.5 border border-zinc-200 bg-zinc-50 rounded text-[9px] font-bold text-zinc-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{log.ipAddress}</td>
                          <td className="px-6 py-4 text-zinc-900 text-right font-medium">
                            {log.details}
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
