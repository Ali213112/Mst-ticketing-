'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Compass, ChevronRight } from 'lucide-react';
import { listEvents, type EventSummary } from '@/lib/api';
import { toDisplayImageUrl } from '@/lib/media';
import Navbar from '@/components/layout/Navbar';
import { PublicListToolbar, FilterChip, ClearFiltersButton } from '@/components/public/PublicListToolbar';

const CATEGORIES = ['Music', 'Sports', 'Conference', 'University', 'Boarding Pass', 'Expo'];

function sortEventsByRecent(events: EventSummary[]): EventSummary[] {
  return [...events].sort((a, b) => {
    const aTs = new Date(a.updatedAt ?? a.createdAt ?? a.eventDate).getTime();
    const bTs = new Date(b.updatedAt ?? b.createdAt ?? b.eventDate).getTime();
    return bTs - aTs;
  });
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const data = await listEvents('recent');
        setEvents(sortEventsByRecent(data));
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(events.map((e) => e.city).filter(Boolean))) as string[],
    [events]
  );
  const organisations = useMemo(
    () => Array.from(new Set(events.map((e) => e.orgName).filter(Boolean))) as string[],
    [events]
  );

  const filteredEvents = useMemo(() => {
    let result = [...events];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.city && e.city.toLowerCase().includes(q)) ||
          (e.orgName && e.orgName.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) {
      result = result.filter((e) => e.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedCity) {
      result = result.filter((e) => e.city?.toLowerCase() === selectedCity.toLowerCase());
    }
    if (selectedOrg) {
      result = result.filter((e) => e.orgName?.toLowerCase() === selectedOrg.toLowerCase());
    }
    return sortEventsByRecent(result);
  }, [events, search, selectedCategory, selectedCity, selectedOrg]);

  const hasActiveFilters = Boolean(search || selectedCategory || selectedCity || selectedOrg);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setSelectedCity(null);
    setSelectedOrg(null);
  };

  return (
    <>
      <Navbar />
      <div className="bg-zinc-50 min-h-[calc(100vh-4rem)] pb-16">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <PublicListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search events, cities, organisers…"
            hasActiveFilters={hasActiveFilters}
            filterPanel={
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={!selectedCategory} onClick={() => setSelectedCategory(null)}>
                      All
                    </FilterChip>
                    {CATEGORIES.map((cat) => (
                      <FilterChip
                        key={cat}
                        active={selectedCategory === cat}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </FilterChip>
                    ))}
                  </div>
                </div>
                {cities.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">City</p>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip active={!selectedCity} onClick={() => setSelectedCity(null)}>
                        All
                      </FilterChip>
                      {cities.map((city) => (
                        <FilterChip
                          key={city}
                          active={selectedCity === city}
                          onClick={() => setSelectedCity(city)}
                        >
                          {city}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                )}
                {organisations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">Organisation</p>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip active={!selectedOrg} onClick={() => setSelectedOrg(null)}>
                        All
                      </FilterChip>
                      {organisations.map((org) => (
                        <FilterChip key={org} active={selectedOrg === org} onClick={() => setSelectedOrg(org)}>
                          {org}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                )}
                {hasActiveFilters && <ClearFiltersButton onClick={clearFilters} />}
              </div>
            }
          />

          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading events…</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center space-y-2">
              <Compass className="w-8 h-8 mx-auto text-zinc-300" />
              <h3 className="text-sm font-semibold text-zinc-950">No events found</h3>
              <p className="text-xs text-zinc-500">Try a different search or clear your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {filteredEvents.map((event) => {
                  const imageSrc = toDisplayImageUrl(event.imageIpfsUrl);
                  return (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl overflow-hidden flex flex-col group transition-all"
                    >
                      <div className="aspect-video bg-zinc-100 relative overflow-hidden border-b border-zinc-100 flex items-center justify-center">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={event.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <Compass className="w-8 h-8 text-zinc-300" />
                        )}
                        {event.category && (
                          <span className="absolute top-2 left-2 text-[10px] font-mono bg-zinc-950 text-white px-2 py-0.5 rounded">
                            {event.category.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="space-y-1">
                          <h2 className="font-semibold text-base text-zinc-950 line-clamp-2">{event.name}</h2>
                          {event.orgName && (
                            <p className="text-[10px] font-mono text-zinc-400 uppercase">{event.orgName}</p>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-zinc-500">
                          <p className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {new Date(event.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {event.city ? `${event.city}${event.country ? `, ${event.country}` : ''}` : 'Location TBA'}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 flex justify-between items-center border-t border-zinc-50">
                          <span className="text-[10px] text-zinc-400 font-mono">{event.totalTicketsSold} sold</span>
                          <Link
                            href={`/events/${event.id}`}
                            className="flex items-center text-xs font-mono font-semibold text-zinc-900 group-hover:underline"
                          >
                            Get tickets
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
