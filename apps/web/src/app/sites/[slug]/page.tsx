'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { getPublicOrgBySlug, listEvents, type EventSummary } from '@/lib/api';
import { toDisplayImageUrl } from '@/lib/media';
import Navbar from '@/components/layout/Navbar';

export default function OrgWhiteLabelPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [org, setOrg] = useState<Awaited<ReturnType<typeof getPublicOrgBySlug>> | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const orgData = await getPublicOrgBySlug(slug);
        if (!orgData) {
          setNotFound(true);
          return;
        }
        setOrg(orgData);
        const all = await listEvents();
        setEvents(all.filter((e) => e.orgId === orgData.id));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const primary = org?.brandPrimaryColor ?? '#18181b';

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-4rem)] bg-zinc-50">
        {loading ? (
          <div className="py-24 text-center text-xs font-mono text-zinc-400">Loading…</div>
        ) : notFound || !org ? (
          <div className="py-24 text-center space-y-2">
            <p className="font-mono font-bold text-zinc-950">Organisation not found</p>
            <Link href="/events" className="text-xs font-mono text-zinc-500 hover:text-zinc-900">
              Browse all events
            </Link>
          </div>
        ) : (
          <>
            <section
              className="py-16 px-4 text-white"
              style={{ backgroundColor: primary }}
            >
              <div className="max-w-4xl mx-auto flex items-center gap-6">
                {org.logoUrl && (
                  <img
                    src={toDisplayImageUrl(org.logoUrl) ?? org.logoUrl}
                    alt=""
                    className="w-16 h-16 rounded object-cover border border-white/20"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold font-mono tracking-tight">{org.name}</h1>
                  {org.description && (
                    <p className="text-sm opacity-80 mt-2 max-w-xl">{org.description}</p>
                  )}
                </div>
              </div>
            </section>

            <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
              <h2 className="text-sm font-mono font-bold uppercase text-zinc-400">Upcoming events</h2>
              {events.length === 0 ? (
                <p className="text-xs font-mono text-zinc-400">No published events yet.</p>
              ) : (
                <div className="grid gap-4">
                  {events.map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="bg-white border border-zinc-200 rounded p-4 flex justify-between items-center hover:border-zinc-400 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-mono font-bold text-zinc-950">{e.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(e.eventDate).toLocaleDateString()}
                          </span>
                          {e.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {e.city}
                            </span>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </Link>
                  ))}
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </>
  );
}
