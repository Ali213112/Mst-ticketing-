'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { getMe, getAdminEvent, getEventAnalytics, type AuthUser, type EventAnalytics } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import EventSubNav from '@/components/admin/EventSubNav';

function exportCsv(analytics: EventAnalytics) {
  const rows = [
    ['Tier', 'Minted', 'Supply', 'Revenue Wei'],
    ...analytics.tierBreakdown.map((t) => [t.tierName, String(t.minted), String(t.totalSupply), t.revenueWei]),
    [],
    ['Total sold', String(analytics.totalTicketsSold)],
    ['Total checked in', String(analytics.totalCheckedIn)],
    ['Attendance rate', `${analytics.attendanceRate}%`],
    ['Total revenue wei', analytics.totalRevenueWei],
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event-${analytics.eventId}-analytics.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventAnalyticsPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [eventName, setEventName] = useState('');
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
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
        setUser(me);
        const [event, data] = await Promise.all([
          getAdminEvent(eventId),
          getEventAnalytics(eventId),
        ]);
        if (event) setEventName(event.name);
        setAnalytics(data);
      } catch {
        setError('Failed to load analytics.');
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
          <span className="text-sm font-mono font-bold uppercase text-zinc-400">Event analytics</span>
        </header>
        <main className="flex-1 p-8 max-w-4xl space-y-6">
          <EventSubNav eventId={eventId} eventName={eventName} />
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500">{error}</p>
            </div>
          ) : loading || !analytics ? (
            <div className="text-xs font-mono text-zinc-400 py-12 text-center">Loading…</div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => exportCsv(analytics)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono font-bold uppercase"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Sold', value: analytics.totalTicketsSold },
                  { label: 'Checked in', value: analytics.totalCheckedIn },
                  { label: 'Attendance', value: `${analytics.attendanceRate}%` },
                  { label: 'Revenue (wei)', value: analytics.totalRevenueWei },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-zinc-200 rounded p-4">
                    <p className="text-[10px] font-mono uppercase text-zinc-400">{s.label}</p>
                    <p className="text-xl font-bold font-mono text-zinc-950">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-zinc-50 border-b text-zinc-400 uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Tier</th>
                      <th className="text-left px-4 py-2">Minted</th>
                      <th className="text-left px-4 py-2">Supply</th>
                      <th className="text-left px-4 py-2">Revenue wei</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.tierBreakdown.map((t) => (
                      <tr key={t.tierName} className="border-b border-zinc-100">
                        <td className="px-4 py-3 font-bold">{t.tierName}</td>
                        <td className="px-4 py-3">{t.minted}</td>
                        <td className="px-4 py-3">{t.totalSupply}</td>
                        <td className="px-4 py-3">{t.revenueWei}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
