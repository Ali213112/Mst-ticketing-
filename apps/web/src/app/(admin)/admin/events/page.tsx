'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle, ShieldAlert } from 'lucide-react';
import { getMe, getAdminEvents, getOnboardingStatus, type AdminEventSummary, type OnboardingStatus } from '@/lib/api';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import {
  AdminEventsList,
  AdminEventsToolbar,
  useEventListFilters,
} from '@/components/admin/AdminEventsList';
import { sortEventsByRecent } from '@/components/admin/eventListUtils';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const { search, setSearch, statusFilter, setStatusFilter } = useEventListFilters();

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Insufficient permissions.');
          setLoading(false);
          return;
        }
        const [eventsData, ob] = await Promise.all([
          getAdminEvents().catch(() => [] as AdminEventSummary[]),
          getOnboardingStatus().catch(() => null),
        ]);
        setEvents(sortEventsByRecent(eventsData));
        setOnboarding(ob);
      } catch (err) {
        console.error(err);
        setError('Failed to load events.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        setShowWizard(true);
      }
    }
  }, []);

  return (
    <AdminPageShell>
      {error ? (
        <div className="bg-paper border border-mist rounded-xl p-12 text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-8 h-8 mx-auto text-silver" />
          <p className="text-sm text-graphite">{error}</p>
        </div>
      ) : loading ? (
        <div className="h-64 flex flex-col justify-center items-center space-y-3 text-graphite">
          <div className="w-6 h-6 border-2 border-mist border-t-ink rounded-full animate-spin" />
          <span className="text-xs font-mono text-silver">Loading events…</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <AdminEventsToolbar
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-ink hover:bg-charcoal text-paper rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>

          {onboarding && !onboarding.kycVerified && (
            <div className="flex items-start gap-3 rounded-lg border border-mist bg-paper p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-graphite" />
              <p className="text-xs text-graphite leading-relaxed">
                KYC pending — you can draft events; on-chain deploy unlocks after verification.{' '}
                <a href="/admin/onboarding" className="text-ink underline">
                  Complete onboarding
                </a>
              </p>
            </div>
          )}

          <AnimatePresence>
            {showWizard && <CreateEventForm onClose={() => setShowWizard(false)} />}
          </AnimatePresence>

          <AdminEventsList
            events={events}
            search={search}
            statusFilter={statusFilter}
            emptyMessage={
              events.length === 0
                ? 'No events yet. Click Create Event to get started.'
                : 'No events match your search or filters.'
            }
          />
        </div>
      )}
    </AdminPageShell>
  );
}
