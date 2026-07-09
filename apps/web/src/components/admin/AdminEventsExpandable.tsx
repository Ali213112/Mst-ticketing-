'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, Plus } from 'lucide-react';
import type { AdminEventSummary } from '@/lib/api';
import { AdminEventsList } from '@/components/admin/AdminEventsList';
import { sortEventsByRecent } from '@/components/admin/eventListUtils';

interface AdminEventsExpandableProps {
  events: AdminEventSummary[];
  defaultOpen?: boolean;
}

export function AdminEventsExpandable({ events, defaultOpen = true }: AdminEventsExpandableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const recent = sortEventsByRecent(events);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50/80 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-950">Events</p>
            <p className="text-[10px] font-mono text-zinc-400">
              {events.length} total · sorted by latest activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/events?create=true"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 text-white rounded-md text-[10px] font-mono font-bold uppercase hover:bg-zinc-800"
          >
            <Plus className="w-3 h-3" />
            New
          </Link>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-zinc-100"
          >
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs font-mono text-zinc-400">
                No events yet.{' '}
                <Link href="/admin/events?create=true" className="text-zinc-900 font-bold hover:underline">
                  Create your first event
                </Link>
              </p>
            ) : (
              <>
                <AdminEventsList events={recent} search="" statusFilter="all" compact />
                {recent.length > 5 && (
                  <div className="px-4 py-3 border-t border-zinc-100 text-center">
                    <Link
                      href="/admin/events"
                      className="text-xs font-mono font-bold text-zinc-700 hover:underline"
                    >
                      View all events →
                    </Link>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
