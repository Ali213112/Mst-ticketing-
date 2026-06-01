'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Shield,
  ArrowRight,
  Loader2,
  AlertCircle,
  QrCode,
  Download
} from 'lucide-react';
import { getMe, getVolunteerEvents, type AuthUser, type VolunteerEvent } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function CheckinLauncherPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineDownloading, setOfflineDownloading] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me) {
          setError('Please sign in to access volunteer check-in scanner.');
          setLoading(false);
          return;
        }

        if (me.role < 1) { // Not volunteer/admin/platform
          setError('Insufficient permissions. Volunteer role required.');
          setLoading(false);
          return;
        }

        setUser(me);
        const data = await getVolunteerEvents().catch(() => [] as VolunteerEvent[]);
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch volunteer data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownloadSnapshot = async (eventId: string) => {
    setOfflineDownloading(eventId);
    try {
      // Simulate downloading offline cache file
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/volunteer/checkin/offline-snapshot?eventId=${eventId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Offline cache download failed');
      const data = await res.json();
      
      // Store in localStorage as high-fidelity offline verification cache
      localStorage.setItem(`offline-snapshot:${eventId}`, JSON.stringify({
        eventId,
        downloadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        data: data.data || []
      }));
      
      alert('Offline cache snapshot downloaded successfully! You can verify tickets offline for the next 4 hours.');
    } catch (err) {
      console.error(err);
      alert('Could not download offline snapshot. Verify connection.');
    } finally {
      setOfflineDownloading(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="bg-zinc-50 min-h-[calc(100vh-4rem)] pb-16">
        {/* Header Hero */}
        <section className="bg-white border-b border-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center space-x-2">
              <span className="h-6 w-6 bg-zinc-900 rounded flex items-center justify-center text-white font-mono font-bold text-xs">
                V
              </span>
              <span className="text-xs font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                Staff Check-in Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-mono">
              ASSIGNED EVENTS
            </h1>
            <p className="text-zinc-500 text-sm max-w-lg">
              Select one of your assigned events to launch the gate scanner. Download local snapshots to permit ticket verification during connectivity failures.
            </p>
          </div>
        </section>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 mt-8">
          {error ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">Access Denied</h3>
                <p className="text-xs text-zinc-500">{error}</p>
              </div>
              {error.includes('sign in') && (
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white rounded text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading assigned events...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center space-y-4">
              <Shield className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">No Assignments Active</h3>
                <p className="text-xs text-zinc-500">
                  Your profile has not been assigned to scan gates for any upcoming events. Please contact the organization admin.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white border border-zinc-200 rounded p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-400 transition-colors"
                >
                  <div className="space-y-2">
                    <h3 className="font-bold font-mono text-zinc-950 uppercase text-sm tracking-tight">
                      {event.name}
                    </h3>
                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs font-mono text-zinc-500">
                      <p className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                      </p>
                      {event.city && (
                        <p className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{event.city}</span>
                        </p>
                      )}
                      <p className="flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>ZONES: {event.permittedZones.length > 0 ? event.permittedZones.join(', ') : 'ALL'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={offlineDownloading !== null}
                      onClick={() => void handleDownloadSnapshot(event.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 rounded text-xs font-mono font-semibold uppercase transition-colors"
                    >
                      {offlineDownloading === event.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Offline snapshot</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/checkin/${event.id}`}
                      className="flex items-center space-x-1 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-mono font-bold uppercase transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan Gate</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
