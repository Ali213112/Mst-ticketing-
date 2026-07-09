'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, Compass, Grid, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { listEvents, listFeaturedEvents, type EventSummary } from '@/lib/api';
import { toDisplayImageUrl } from '@/lib/media';
import Navbar from '@/components/layout/Navbar';

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [featured, setFeatured] = useState<EventSummary[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [sort, setSort] = useState<'upcoming' | 'recent'>('upcoming');
  const [loading, setLoading] = useState(true);

  // Categories list extracted from mock/spec definitions
  const categories = ['Music', 'Sports', 'Conference', 'University', 'Boarding Pass', 'Expo'];

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const [data, featuredData] = await Promise.all([
          listEvents(sort),
          listFeaturedEvents().catch(() => [] as EventSummary[]),
        ]);
        setEvents(data);
        setFeatured(featuredData);
        setFilteredEvents(data);
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sort]);

  // Filter logic
  useEffect(() => {
    let result = [...events];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.city && e.city.toLowerCase().includes(q)) ||
          (e.orgName && e.orgName.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter(
        (e) => e.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedCity) {
      result = result.filter((e) => e.city?.toLowerCase() === selectedCity.toLowerCase());
    }

    if (selectedOrg) {
      result = result.filter((e) => e.orgName?.toLowerCase() === selectedOrg.toLowerCase());
    }

    setFilteredEvents(result);
  }, [search, selectedCategory, selectedCity, selectedOrg, events]);

  // Extract unique cities and organisations
  const cities = Array.from(new Set(events.map((e) => e.city).filter(Boolean))) as string[];
  const organisations = Array.from(new Set(events.map((e) => e.orgName).filter(Boolean))) as string[];

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
        {/* Hero Section */}
        <section className="bg-white border-b border-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 font-mono">
              BROWSE EVENTS
            </h1>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
              Discover verified NFT tickets for concerts, sporting events, academic conferences, and institutional boarding passes.
            </p>
          </div>
        </section>

        {/* Featured events */}
        {featured.length > 0 && !search && !selectedCategory && !selectedCity && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-4">
              Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.slice(0, 3).map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="group bg-white border border-zinc-200 rounded overflow-hidden hover:border-zinc-400 transition-colors"
                >
                  {e.imageIpfsUrl && (
                    <div
                      className="h-32 bg-zinc-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${toDisplayImageUrl(e.imageIpfsUrl)})` }}
                    />
                  )}
                  <div className="p-4 space-y-1">
                    <p className="font-mono font-bold text-sm text-zinc-950 group-hover:underline">{e.name}</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(e.eventDate).toLocaleDateString()}
                      {e.city && (
                        <>
                          <MapPin className="w-3 h-3 ml-2" />
                          {e.city}
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Content Section */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar Filters */}
            <div className="lg:col-span-1 space-y-6">
              {/* Search Widget */}
              <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by event or city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:border-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Categories Widget */}
              <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Grid className="w-3.5 h-3.5" />
                  <span>Category</span>
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                      selectedCategory === null
                        ? 'bg-zinc-900 text-white font-medium'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                        selectedCategory === cat
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cities Widget */}
              {cities.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location</span>
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCity(null)}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                        selectedCity === null
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      All Locations
                    </button>
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          selectedCity === city
                            ? 'bg-zinc-900 text-white font-medium'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Organisations Widget */}
              {organisations.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Organisation</span>
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedOrg(null)}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                        selectedOrg === null
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      All Organisations
                    </button>
                    {organisations.map((org) => (
                      <button
                        key={org}
                        onClick={() => setSelectedOrg(org)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          selectedOrg === org
                            ? 'bg-zinc-900 text-white font-medium'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear button */}
              {(search || selectedCategory || selectedCity || selectedOrg) && (
                <button
                  onClick={clearFilters}
                  className="w-full text-center py-2 text-xs font-mono text-zinc-500 hover:text-zinc-900 border border-dashed border-zinc-200 rounded hover:border-zinc-400 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Grid of Events */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sorting and result count header */}
              <div className="flex justify-between items-center bg-white border border-zinc-200 rounded p-4">
                <span className="text-xs font-mono text-zinc-500 uppercase">
                  {filteredEvents.length} events found
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Sort By:</span>
                  <div className="flex rounded bg-zinc-150 p-0.5 border border-zinc-200">
                    <button
                      onClick={() => setSort('upcoming')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded ${
                        sort === 'upcoming' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setSort('recent')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded ${
                        sort === 'recent' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Recent
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
                  <span className="text-xs font-mono">Fetching published events...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded p-12 text-center space-y-2">
                  <Compass className="w-8 h-8 mx-auto text-zinc-300" />
                  <h3 className="text-sm font-semibold text-zinc-950">No events found</h3>
                  <p className="text-xs text-zinc-500">
                    Try adjusting your keyword search or category filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="bg-white border border-zinc-200 hover:border-zinc-900 rounded overflow-hidden flex flex-col justify-between group transition-all duration-300"
                        >
                          <div>
                            {/* Image box */}
                            <div className="aspect-video bg-zinc-100 relative overflow-hidden border-b border-zinc-100 flex items-center justify-center">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={event.name}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                />
                              ) : (
                                <Compass className="w-8 h-8 text-zinc-300 group-hover:text-zinc-500 group-hover:scale-110 transition-all duration-300" />
                              )}
                              {event.category && (
                                <span className="absolute top-2 left-2 text-[10px] font-mono bg-zinc-950 text-white px-2 py-0.5 rounded tracking-wide">
                                  {event.category.toUpperCase()}
                                </span>
                              )}
                              {event.orgName && (
                                <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-white/95 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded tracking-wide">
                                  {event.orgName}
                                </span>
                              )}
                            </div>

                            <div className="p-5 space-y-2">
                              <h2 className="font-bold text-lg text-zinc-950 font-mono tracking-tight group-hover:text-zinc-900">
                                {event.name}
                              </h2>
                              <div className="space-y-1">
                                <p className="text-xs text-zinc-500 flex items-center space-x-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{new Date(event.eventDate).toLocaleDateString(undefined, {
                                    dateStyle: 'medium'
                                  })}</span>
                                </p>
                                <p className="text-xs text-zinc-500 flex items-center space-x-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{event.city ? `${event.city}, ${event.country}` : 'Location TBA'}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Card bottom details */}
                          <div className="px-5 pb-5 pt-2 flex justify-between items-center border-t border-zinc-50 mt-4">
                            <span className="text-xs text-zinc-400 font-mono">
                              {event.totalTicketsSold} sold
                            </span>
                            <Link
                              href={`/events/${event.id}`}
                              className="flex items-center text-xs font-mono font-semibold text-zinc-900 group-hover:translate-x-1 transition-transform"
                            >
                              <span>GET TICKETS</span>
                              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
