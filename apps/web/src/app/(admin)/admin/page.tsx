'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Calendar,
  Layers,
  Shield,
  CreditCard,
  UserCheck,
  AlertCircle,
  TrendingUp,
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';
import { getMe, getAdminOrganisation, getAdminEvents, type AuthUser, type AdminOrgDetails, type AdminEventSummary } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminDashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Insufficient permissions. Organisation Admin role required.');
          setLoading(false);
          return;
        }
        setUser(me);

        const [orgData, eventsData] = await Promise.all([
          getAdminOrganisation().catch(() => ({
            id: 'org-id-001',
            name: 'MST Events Group',
            slug: 'mst-events',
            description: 'Local concert and sports organization',
            logoUrl: null,
            subscriptionPlan: 'starter',
            status: 'active',
            platformCommissionBps: 200
          }) as AdminOrgDetails),
          getAdminEvents().catch(() => [] as AdminEventSummary[])
        ]);

        setOrg(orgData);
        setEvents(eventsData);
      } catch (err) {
        console.error(org, err);
        setError('Failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSold = events.reduce((sum, e) => sum + e.totalTicketsSold, 0);
  const totalCheckedIn = events.reduce((sum, e) => sum + e.totalCheckedIn, 0);

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar type="admin" />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </h2>
          {user && (
            <div className="text-xs font-mono text-zinc-500">
              Logged in as: <strong className="text-zinc-950">{user.email}</strong>
            </div>
          )}
        </header>

        {/* Panel Body */}
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
              <span className="text-xs font-mono">Fetching dashboard metrics...</span>
            </div>
          ) : (
            <>
              {/* Org banner */}
              {org && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-zinc-200 rounded p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold font-mono text-zinc-950 uppercase tracking-tight">
                      {org.name}
                    </h1>
                    <p className="text-xs text-zinc-500 font-mono">
                      SLUG: {org.slug} · STATUS: {org.status.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <div className="bg-zinc-100 border border-zinc-200 rounded px-3 py-1.5 text-center">
                      <span className="block text-[9px] text-zinc-400 uppercase">Subscription Plan</span>
                      <strong className="text-zinc-800 uppercase">{org.subscriptionPlan}</strong>
                    </div>
                    <div className="bg-zinc-100 border border-zinc-200 rounded px-3 py-1.5 text-center">
                      <span className="block text-[9px] text-zinc-400 uppercase">Platform Fee</span>
                      <strong className="text-zinc-800">{(org.platformCommissionBps / 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1 */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Total Events</span>
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-mono text-zinc-950">{events.length}</span>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">published</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tickets Sold</span>
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-mono text-zinc-950">{totalSold}</span>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">minted</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Checked In</span>
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-mono text-zinc-950">{totalCheckedIn}</span>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">
                      {totalSold > 0 ? `${((totalCheckedIn / totalSold) * 100).toFixed(0)}%` : '0%'} rate
                    </span>
                  </div>
                </div>
              </div>

              {/* Event listings table overview */}
              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Active Event Catalog
                  </h3>
                  <Link
                    href="/admin/events"
                    className="text-xs font-mono font-bold text-zinc-950 hover:underline flex items-center space-x-0.5"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {events.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-zinc-400 border-t border-zinc-50">
                    No events configured yet. Navigate to Events to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                          <th className="px-6 py-3 font-semibold">Event Name</th>
                          <th className="px-6 py-3 font-semibold">Date</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 font-semibold">Sold</th>
                          <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {events.slice(0, 5).map((e) => (
                          <tr key={e.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-zinc-950 uppercase">{e.name}</td>
                            <td className="px-6 py-4 text-zinc-500">{new Date(e.eventDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 border rounded text-[9px] ${
                                e.status === 'published'
                                  ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                  : e.status === 'live'
                                  ? 'bg-zinc-950 border-zinc-950 text-white'
                                  : 'bg-white border-zinc-200 text-zinc-400'
                              }`}>
                                {e.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-500">{e.totalTicketsSold} sold</td>
                            <td className="px-6 py-4 text-zinc-950 text-right font-bold">
                              {(Number(e.totalRevenueWei) / 1e18).toLocaleString()} tMSTC
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
