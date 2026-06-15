'use client';

import { useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { getMe, getPlatformEvents, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformEventsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getPlatformEvents>>>([]);
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
        setEvents(await getPlatformEvents());
      } catch {
        setError('Failed to load events.');
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
            <Calendar className="w-4 h-4" />
            All events
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
                    <th className="text-left px-4 py-2">Event</th>
                    <th className="text-left px-4 py-2">Organisation</th>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">City</th>
                    <th className="text-left px-4 py-2">Sold</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="px-4 py-3 font-bold">{e.name}</td>
                      <td className="px-4 py-3">{e.orgName}</td>
                      <td className="px-4 py-3">{new Date(e.eventDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{e.city ?? '—'}</td>
                      <td className="px-4 py-3">{e.totalTicketsSold}</td>
                      <td className="px-4 py-3 capitalize">{e.status}</td>
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
