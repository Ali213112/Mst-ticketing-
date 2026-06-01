'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Layers,
  Cpu,
  CheckCircle,
  XCircle,
  Play,
  Download,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { getMe, getEvent, updateEventStatus, type AuthUser, type EventDetail, type TierResponse } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminEventDetailPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status transitions loaders
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Seat map designer state
  const [selectedSeatSection, setSelectedSeatSection] = useState<string | null>(null);
  const seatGrid = Array.from({ length: 24 }, (_, i) => ({
    id: `sec-${i + 1}`,
    name: `Section ${String.fromCharCode(65 + Math.floor(i / 6))}${i % 6 + 1}`,
    capacity: 50,
    allocated: i < 8
  }));

  const fetchEventDetails = async () => {
    try {
      const data = await getEvent(eventId);
      if (data) {
        setEvent(data);
      } else {
        setError('Event not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch event details.');
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
        await fetchEventDetails();
      } catch (err) {
        console.error(err);
        setError('Failed to load event console.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStatusChange = async (action: 'deploy' | 'publish' | 'go-live' | 'end' | 'cancel') => {
    setActionLoading(action);
    setError(null);
    try {
      await updateEventStatus(eventId, action);
      await fetchEventDetails();
      alert(`Event status updated successfully! Action: ${action.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to execute: ${action}`);
    } finally {
      setActionLoading(null);
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
          <div className="flex items-center space-x-2">
            <Link
              href="/admin/events"
              className="p-1 text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400">
              Event Lifecycle manager
            </h2>
          </div>
          {event && (
            <div className="text-xs font-mono text-zinc-500">
              STATUS: <strong className="text-zinc-950 uppercase">{event.status}</strong>
            </div>
          )}
        </header>

        {/* Panel Body */}
        <main className="flex-1 p-8 max-w-5xl space-y-8">
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 text-red-700 p-3 rounded text-xs border border-red-100 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Fetching event schema details...</span>
            </div>
          ) : event === null ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center text-xs font-mono text-zinc-400">
              Event details are empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details, Status Transitions, & Tiers */}
              <div className="lg:col-span-2 space-y-6">
                {/* Event summary card */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded uppercase tracking-wider">
                      Event UUID: {event.id}
                    </span>
                    <h1 className="text-xl font-bold font-mono text-zinc-950 uppercase tracking-tight pt-1">
                      {event.name}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs font-mono text-zinc-500 border-t border-zinc-100 pt-3">
                    <p className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                    </p>
                    <p className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{[event.venueName, event.city].filter(Boolean).join(', ')}</span>
                    </p>
                  </div>
                </div>

                {/* Status transitions console */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>State transitions control deck</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Action 1: Deploy */}
                    <button
                      type="button"
                      disabled={event.status !== 'draft' || actionLoading !== null}
                      onClick={() => void handleStatusChange('deploy')}
                      className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-950 rounded text-center transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                      {actionLoading === 'deploy' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                      ) : (
                        <Cpu className="w-5 h-5 text-zinc-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1">1. DEPLOY CONTRACT</span>
                    </button>

                    {/* Action 2: Publish */}
                    <button
                      type="button"
                      disabled={!event.contractAddress || event.status !== 'draft' || actionLoading !== null}
                      onClick={() => void handleStatusChange('publish')}
                      className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-950 rounded text-center transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                      {actionLoading === 'publish' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-zinc-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1">2. PUBLISH SALES</span>
                    </button>

                    {/* Action 3: Go live */}
                    <button
                      type="button"
                      disabled={event.status !== 'published' || actionLoading !== null}
                      onClick={() => void handleStatusChange('go-live')}
                      className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-950 rounded text-center transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                      {actionLoading === 'go-live' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                      ) : (
                        <Play className="w-5 h-5 text-zinc-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1">3. OPEN GATES</span>
                    </button>

                    {/* Action 4: End */}
                    <button
                      type="button"
                      disabled={event.status !== 'live' || actionLoading !== null}
                      onClick={() => void handleStatusChange('end')}
                      className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-zinc-950 rounded text-center transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                      {actionLoading === 'end' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                      ) : (
                        <Download className="w-5 h-5 text-zinc-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1">4. END &amp; SETTLE</span>
                    </button>

                    {/* Action 5: Cancel */}
                    <button
                      type="button"
                      disabled={['ended', 'cancelled'].includes(event.status) || actionLoading !== null}
                      onClick={() => void handleStatusChange('cancel')}
                      className="flex flex-col items-center justify-center p-3 border border-zinc-200 hover:border-red-900 rounded text-center transition-colors disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                      {actionLoading === 'cancel' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                      ) : (
                        <XCircle className="w-5 h-5 text-zinc-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1">CANCEL &amp; REFUND</span>
                    </button>
                  </div>
                </div>

                {/* Ticket tiers configs */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Configured Ticket Tiers</span>
                  </h3>

                  {event.tiers && event.tiers.length > 0 ? (
                    <div className="space-y-3">
                      {event.tiers.map((tier) => (
                        <div
                          key={tier.id}
                          className="flex justify-between items-center text-xs font-mono border border-zinc-100 rounded p-4 bg-zinc-50"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-zinc-950 uppercase">{tier.name}</span>
                            <p className="text-zinc-500">
                              Minted: {tier.minted} / {tier.totalSupply} · Max: {tier.maxPerWallet} / user
                            </p>
                          </div>
                          <span className="font-bold text-zinc-900">
                            {tier.priceDisplay ? `${tier.priceDisplay} INR` : `${Number(tier.priceWei) / 1e18} tMSTC`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-zinc-450 border border-dashed border-zinc-150 p-6 text-center rounded">
                      No tiers configured.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Seat Map Designer Mockup */}
              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>Visual Seat map designer</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono leading-normal">
                    Layout allocation preview. Selected sections link ticket tiers to specific seated inventory.
                  </p>

                  {/* Seat coordinates grid */}
                  <div className="grid grid-cols-6 gap-1 bg-zinc-50 p-3 border border-zinc-100 rounded">
                    {seatGrid.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedSeatSection(item.id)}
                        className={`aspect-square border rounded text-[9px] font-mono flex items-center justify-center transition-all ${
                          selectedSeatSection === item.id
                            ? 'bg-zinc-900 border-zinc-900 text-white font-bold'
                            : item.allocated
                            ? 'bg-zinc-200 border-zinc-300 text-zinc-800'
                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-650'
                        }`}
                      >
                        {item.name.replace('Section ', '')}
                      </button>
                    ))}
                  </div>

                  {/* Section allocation details */}
                  {selectedSeatSection && (
                    <div className="bg-zinc-50 border border-zinc-150 rounded p-3 text-[10px] font-mono space-y-2">
                      <div className="flex justify-between items-center font-bold border-b border-zinc-200 pb-1">
                        <span>SECTION DETAILS</span>
                        <span className="text-zinc-500 uppercase">{selectedSeatSection}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="flex justify-between">
                          <span>NAME:</span>
                          <strong>{seatGrid.find(g => g.id === selectedSeatSection)?.name}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>CAPACITY:</span>
                          <strong>50 seats</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>ALLOCATION:</span>
                          <strong className="text-zinc-650">
                            {seatGrid.find(g => g.id === selectedSeatSection)?.allocated ? 'ASSIGNED TO TIER' : 'UNASSIGNED'}
                          </strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSeatSection(null)}
                        className="w-full text-center py-1 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 rounded uppercase text-[9px]"
                      >
                        Close Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
