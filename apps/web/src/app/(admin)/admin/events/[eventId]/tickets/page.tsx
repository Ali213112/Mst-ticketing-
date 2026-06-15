'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { getMe, getAdminEvent, getEventTicketsAdmin, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import EventSubNav from '@/components/admin/EventSubNav';

export default function EventTicketsPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;
  const [eventName, setEventName] = useState('');
  const [tickets, setTickets] = useState<Array<{
    id: string;
    tierName: string;
    ownerWallet: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Admin access required.');
          return;
        }
        const [event, data] = await Promise.all([
          getAdminEvent(eventId),
          getEventTicketsAdmin(eventId),
        ]);
        if (event) setEventName(event.name);
        setTickets(data);
      } catch {
        setError('Failed to load tickets.');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center px-8 gap-4">
          <Link href="/admin/events" className="text-zinc-400 hover:text-zinc-900">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-mono font-bold uppercase text-zinc-400">Event tickets</span>
        </header>
        <main className="flex-1 p-8 max-w-5xl space-y-6">
          <EventSubNav eventId={eventId} eventName={eventName} />
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
                    <th className="text-left px-4 py-2">Ticket ID</th>
                    <th className="text-left px-4 py-2">Tier</th>
                    <th className="text-left px-4 py-2">Owner</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Minted</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">No tickets minted yet.</td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr key={t.id} className="border-b border-zinc-100">
                        <td className="px-4 py-3 font-bold">{t.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3">{t.tierName}</td>
                        <td className="px-4 py-3 truncate max-w-[180px]">{t.ownerWallet}</td>
                        <td className="px-4 py-3 capitalize">{t.status}</td>
                        <td className="px-4 py-3">{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
