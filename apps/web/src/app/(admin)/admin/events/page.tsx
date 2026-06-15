'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Tag,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { getMe, getAdminEvents, createAdminEvent, getOnboardingStatus, type AuthUser, type AdminEventSummary, type OnboardingStatus } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import { ContractExplorerLink } from '@/components/blockchain/ContractExplorerLink';

export default function AdminEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form toggle & state
  const [showWizard, setShowWizard] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('Music');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [tags, setTags] = useState('');
  const [resaleEnabled, setResaleEnabled] = useState(false);
  const [usePriceCap, setUsePriceCap] = useState(false);
  const [resalePriceCapPercent, setResalePriceCapPercent] = useState(150);
  const [useResaleRoyalty, setUseResaleRoyalty] = useState(false);
  const [resaleRoyaltyPercent, setResaleRoyaltyPercent] = useState(5);
  const [zones, setZones] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const data = await getAdminEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Insufficient permissions.');
          setLoading(false);
          return;
        }
        setUser(me);
        const [, ob] = await Promise.all([
          fetchEvents(),
          getOnboardingStatus().catch(() => null),
        ]);
        setOnboarding(ob);
      } catch (err) {
        console.error(err);
        setError('Failed to load events.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !eventDate || !venueName.trim() || !city.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const start = new Date(eventDate);
    if (Number.isNaN(start.getTime())) {
      setFormError('Enter a valid start date and time.');
      return;
    }
    let endIso: string | undefined;
    if (eventEndDate) {
      const end = new Date(eventEndDate);
      if (Number.isNaN(end.getTime())) {
        setFormError('Enter a valid end date and time.');
        return;
      }
      if (end < start) {
        setFormError('End date must be after the start date.');
        return;
      }
      endIso = end.toISOString();
    }

    const ageNum = ageRestriction.trim() ? Number(ageRestriction) : undefined;
    if (ageNum !== undefined && (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 99)) {
      setFormError('Age restriction must be between 0 and 99.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      const created = await createAdminEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        eventDate: start.toISOString(),
        eventEndDate: endIso,
        venueName: venueName.trim(),
        city: city.trim(),
        category,
        ageRestriction: ageNum,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        resaleEnabled,
        resalePriceCapBps:
          resaleEnabled && usePriceCap ? Math.round(resalePriceCapPercent * 100) : undefined,
        resaleRoyaltyBps:
          resaleEnabled && useResaleRoyalty ? Math.round(resaleRoyaltyPercent * 100) : undefined,
        zones: zones.trim() ? zones.split(',').map((z) => z.trim()).filter(Boolean) : undefined,
      });

      router.push(`/admin/events/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Event creation failed');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar type="admin" />

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4" />
            <span>Events Manager</span>
          </h2>
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </button>
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
              <span className="text-xs font-mono">Fetching events catalog...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KYC verification banner */}
              {onboarding && !onboarding.kycVerified && (
                <div className="flex items-start space-x-3 rounded border border-amber-200 bg-amber-50 p-4">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wide">
                      KYC verification pending
                    </p>
                    <p className="text-xs font-mono text-amber-700 leading-relaxed">
                      {onboarding.kycSubmitted
                        ? 'Your KYC is under review. You can create and configure draft events now — deploying them on-chain will be unlocked once the platform verifies your organisation.'
                        : 'Your organisation is not yet verified. You can create and configure draft events in advance. Deploying events on the blockchain requires KYC approval from the platform.'}
                    </p>
                    {!onboarding.kycSubmitted && (
                      <a
                        href="/admin/onboarding"
                        className="inline-block mt-1 text-[10px] font-mono font-bold text-amber-800 underline hover:text-amber-900"
                      >
                        Complete onboarding →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Creator Form wizard modal/drawer */}
              <AnimatePresence>
                {showWizard && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={(e) => void handleCreate(e)}
                      className="bg-white border border-zinc-200 rounded p-6 space-y-4 shadow-sm"
                    >
                      <h3 className="font-bold font-mono text-zinc-950 text-sm uppercase tracking-tight flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-zinc-600" />
                        <span>Configure New Event</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Event Title*</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. TechFest Concert 2026"
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white placeholder-zinc-300 focus:outline-none focus:border-zinc-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                          >
                            <option value="Music">Music Concert</option>
                            <option value="Sports">Sports Match</option>
                            <option value="Conference">Conference / Seminar</option>
                            <option value="University">University Pass</option>
                            <option value="Boarding Pass">Boarding Pass</option>
                            <option value="Expo">Expo / Exhibition</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Start date &amp; time*</label>
                          <input
                            type="datetime-local"
                            required
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">End date &amp; time</label>
                          <input
                            type="datetime-local"
                            value={eventEndDate}
                            onChange={(e) => setEventEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Age restriction</label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={ageRestriction}
                            onChange={(e) => setAgeRestriction(e.target.value)}
                            placeholder="e.g. 18"
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Venue Name*</label>
                          <input
                            type="text"
                            required
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="e.g. NSCI Dome, Worli"
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white placeholder-zinc-300 focus:outline-none focus:border-zinc-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">City*</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Mumbai"
                            className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white placeholder-zinc-300 focus:outline-none focus:border-zinc-900"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Description</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Provide details about registration rules, timing, guidelines..."
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white placeholder-zinc-300 focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Tags (comma-separated)</label>
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="live, outdoor, vip"
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">Access zones (comma-separated)</label>
                        <input
                          type="text"
                          value={zones}
                          onChange={(e) => setZones(e.target.value)}
                          placeholder="Gate A, VIP Lounge, Backstage"
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                        />
                      </div>

                      <div className="border border-zinc-100 rounded p-4 space-y-3">
                        <label className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={resaleEnabled}
                            onChange={(e) => {
                              setResaleEnabled(e.target.checked);
                              if (!e.target.checked) {
                                setUsePriceCap(false);
                                setUseResaleRoyalty(false);
                              }
                            }}
                            className="rounded"
                          />
                          Enable ticket resale
                        </label>
                        {resaleEnabled && (
                          <div className="space-y-3 pl-1 border-l-2 border-zinc-100 ml-1">
                            <p className="text-[9px] text-zinc-400 font-mono">
                              Choose one or both resale rules — leave unchecked to use platform defaults.
                            </p>

                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-xs font-mono text-zinc-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={usePriceCap}
                                  onChange={(e) => setUsePriceCap(e.target.checked)}
                                  className="rounded"
                                />
                                Set max resale price (price cap)
                              </label>
                              {usePriceCap && (
                                <div className="space-y-1 ml-6">
                                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">
                                    Max resale price (% of face value)
                                  </label>
                                  <input
                                    type="number"
                                    min={100}
                                    max={1000}
                                    step={1}
                                    value={resalePriceCapPercent}
                                    onChange={(e) => setResalePriceCapPercent(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                                  />
                                  <p className="text-[9px] text-zinc-400">150 = sellers can list up to 150% of the original ticket price</p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-xs font-mono text-zinc-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useResaleRoyalty}
                                  onChange={(e) => setUseResaleRoyalty(e.target.checked)}
                                  className="rounded"
                                />
                                Set resale royalty (% to organisation)
                              </label>
                              {useResaleRoyalty && (
                                <div className="space-y-1 ml-6">
                                  <label className="block text-[10px] font-mono font-bold uppercase text-zinc-400">
                                    Royalty on each resale (%)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={resaleRoyaltyPercent}
                                    onChange={(e) => setResaleRoyaltyPercent(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-xs font-mono bg-white focus:outline-none focus:border-zinc-900"
                                  />
                                  <p className="text-[9px] text-zinc-400">5 = your organisation earns 5% of every resale transaction</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {formError && (
                        <div className="flex items-center space-x-2 bg-red-50 text-red-700 p-2.5 rounded text-xs border border-red-100 font-mono">
                          <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowWizard(false)}
                          className="px-4 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded text-xs font-mono font-semibold uppercase transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={formLoading}
                          className="flex items-center space-x-1 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-mono font-bold uppercase transition-colors"
                        >
                          {formLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <span>Create event</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Event grid list */}
              {events.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded p-12 text-center space-y-4">
                  <Calendar className="w-8 h-8 mx-auto text-zinc-300 animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-950">No events active</h3>
                    <p className="text-xs text-zinc-500">
                      Create your first event catalog configuration using the wizard button above.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white border border-zinc-200 hover:border-zinc-400 rounded p-6 flex flex-col justify-between transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded uppercase tracking-wider">
                            Category: {event.status.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded tracking-wider border ${
                            event.status === 'published'
                              ? 'bg-zinc-50 text-zinc-700 border-zinc-200'
                              : event.status === 'live'
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through'
                          }`}>
                            {event.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-bold font-mono text-zinc-950 uppercase text-sm tracking-tight truncate">
                            {event.name}
                          </h3>
                          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-50 pt-4 mt-6 text-[10px] font-mono text-zinc-500">
                        <div className="space-y-0.5">
                          <span>TICKETS SOLD</span>
                          <p className="font-bold text-zinc-900">{event.totalTicketsSold} tickets</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span>CONTRACT DEPLOY</span>
                          <p className="font-bold text-zinc-900 truncate flex items-center justify-end gap-1">
                            {event.contractAddress ? (
                              <>
                                <span>Escrow active</span>
                                <ContractExplorerLink value={event.contractAddress} />
                              </>
                            ) : (
                              'TBD'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-zinc-50 pt-4 mt-4 flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                          ID: {event.id}
                        </span>
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="flex items-center text-xs font-mono font-bold text-zinc-950 hover:underline"
                        >
                          <span>Manage Event</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
