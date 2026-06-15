'use client';

import { useEffect, useState } from 'react';
import { Ticket, AlertCircle } from 'lucide-react';
import { getMe, getPlatformTickets, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformTicketsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof getPlatformTickets>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          setError('Platform admin required.');
          return;
        }
        setUser(me);
        setTickets(await getPlatformTickets());
      } catch {
        setError('Failed to load tickets.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <Ticket className="w-4 h-4" />
            All tickets
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>
        <main className="flex-1 p-8 max-w-6xl">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 mt-2">{error}</p>
            </div>
          ) : loading ? (
            <div className="text-xs font-mono text-zinc-400 text-center py-12">Loading…</div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-zinc-50 border-b text-zinc-400 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">ID</th>
                    <th className="text-left px-4 py-2">Event</th>
                    <th className="text-left px-4 py-2">Org</th>
                    <th className="text-left px-4 py-2">Tier</th>
                    <th className="text-left px-4 py-2">Owner</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-100">
                      <td className="px-4 py-3">{t.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-bold">{t.eventName}</td>
                      <td className="px-4 py-3">{t.orgName}</td>
                      <td className="px-4 py-3">{t.tierName}</td>
                      <td className="px-4 py-3 truncate max-w-[140px]">{t.ownerWallet}</td>
                      <td className="px-4 py-3 capitalize">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
