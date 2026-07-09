import type { AdminEventSummary } from '@/lib/api';

export type EventStatusFilter = 'all' | 'draft' | 'published' | 'live' | 'ended' | 'cancelled';

export function sortEventsByRecent(events: AdminEventSummary[]): AdminEventSummary[] {
  return [...events].sort((a, b) => {
    const aTs = new Date(a.updatedAt ?? a.eventDate).getTime();
    const bTs = new Date(b.updatedAt ?? b.eventDate).getTime();
    return bTs - aTs;
  });
}

export function filterEvents(
  events: AdminEventSummary[],
  query: string,
  status: EventStatusFilter
): AdminEventSummary[] {
  const q = query.trim().toLowerCase();
  return events.filter((e) => {
    if (status !== 'all' && e.status !== status) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  });
}

export const STATUS_FILTER_OPTIONS: { value: EventStatusFilter; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'live', label: 'Live' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-mist/50 text-graphite border-mist';
    case 'live':
      return 'bg-ink text-paper border-ink';
    case 'ended':
      return 'border-graphite text-graphite';
    case 'cancelled':
      return 'border-mist text-silver line-through';
    default:
      return 'bg-mist/30 text-graphite border-mist';
  }
}
