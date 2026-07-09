'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { AdminEventSummary } from '@/lib/api';
import { ContractExplorerLink } from '@/components/blockchain/ContractExplorerLink';
import {
  filterEvents,
  sortEventsByRecent,
  STATUS_FILTER_OPTIONS,
  statusBadgeClass,
  type EventStatusFilter,
} from '@/components/admin/eventListUtils';

interface AdminEventsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: EventStatusFilter;
  onStatusFilterChange: (value: EventStatusFilter) => void;
}

export function AdminEventsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: AdminEventsToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-mist rounded-lg bg-paper text-ink placeholder:text-silver focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
            filtersOpen || statusFilter !== 'all'
              ? 'border-ink/30 bg-mist/40 text-ink'
              : 'border-mist text-graphite hover:bg-mist/30'
          }`}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 p-3 border border-mist rounded-lg bg-mist/20">
          <span className="text-[10px] font-mono uppercase tracking-wider text-silver w-full sm:w-auto">
            Event type
          </span>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-graphite border-mist hover:border-ink/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onStatusFilterChange('all')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-silver hover:text-ink"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface AdminEventsListProps {
  events: AdminEventSummary[];
  search: string;
  statusFilter: EventStatusFilter;
  emptyMessage?: string;
  compact?: boolean;
}

export function AdminEventsList({
  events,
  search,
  statusFilter,
  emptyMessage = 'No events match your search.',
  compact = false,
}: AdminEventsListProps) {
  const filtered = useMemo(
    () => sortEventsByRecent(filterEvents(events, search, statusFilter)),
    [events, search, statusFilter]
  );

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-silver font-mono text-center py-10">{emptyMessage}</p>
    );
  }

  if (compact) {
    return (
      <ul className="divide-y divide-mist">
        {filtered.map((event) => (
          <li key={event.id}>
            <Link
              href={`/admin/events/${event.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-mist/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{event.name}</p>
                <p className="text-[10px] font-mono text-silver">
                  {new Date(event.eventDate).toLocaleDateString()} · {event.totalTicketsSold} sold
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${statusBadgeClass(event.status)}`}
              >
                {event.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="divide-y divide-mist border border-mist rounded-xl overflow-hidden bg-paper">
      {filtered.map((event) => (
        <Link
          key={event.id}
          href={`/admin/events/${event.id}`}
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 hover:bg-mist/20 transition-colors"
        >
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-ink truncate">{event.name}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${statusBadgeClass(event.status)}`}
              >
                {event.status}
              </span>
            </div>
            <p className="text-xs font-mono text-silver">
              {new Date(event.eventDate).toLocaleString()} · {event.totalTicketsSold} tickets sold
              {event.updatedAt && (
                <> · updated {new Date(event.updatedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-graphite shrink-0">
            <span>{(Number(event.totalRevenueWei ?? 0) / 1e18).toLocaleString()} tMSTC</span>
            {event.contractAddress ? (
              <ContractExplorerLink value={event.contractAddress} type="address" />
            ) : (
              <span className="text-silver">No contract</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function useEventListFilters() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('all');
  return { search, setSearch, statusFilter, setStatusFilter };
}
