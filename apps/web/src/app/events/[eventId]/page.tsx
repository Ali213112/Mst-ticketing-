import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Calendar, MapPin, Layers, Compass, Tag } from 'lucide-react';
import { ContractAddressRow } from '@/components/blockchain/ContractExplorerLink';
import { TierPurchase } from '@/components/TierPurchase';
import { getEvent } from '@/lib/api';
import { toDisplayImageUrl } from '@/lib/media';
import Navbar from '@/components/layout/Navbar';

export default async function EventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const event = await getEvent(params.eventId);
  if (!event) notFound();

  const tiers = event.tiers ?? [];
  const imageSrc = toDisplayImageUrl(event.imageIpfsUrl);

  return (
    <>
      <Navbar />
      <div className="bg-zinc-50 min-h-[calc(100vh-4rem)] pb-16">
        {/* Detail Top Panel */}
        <section className="bg-white border-b border-zinc-200 py-6">
          <div className="max-w-4xl mx-auto px-4">
            <Link
              href="/events"
              className="inline-flex items-center text-xs font-mono font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>BACK TO EVENTS</span>
            </Link>
          </div>
        </section>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 mt-8">
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            {/* Event Banner */}
            <div className="aspect-[21/9] bg-zinc-100 border-b border-zinc-100 flex items-center justify-center relative">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={event.name}
                  className="w-full h-full object-cover grayscale"
                />
              ) : (
                <Compass className="w-12 h-12 text-zinc-300" />
              )}
              {event.category && (
                <span className="absolute top-4 left-4 text-xs font-mono bg-zinc-950 text-white px-2.5 py-0.5 rounded tracking-wider uppercase">
                  {event.category}
                </span>
              )}
            </div>

            {/* Event Information */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 font-mono uppercase">
                  {event.name}
                </h1>
                <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-zinc-500 font-mono border-t border-zinc-100 pt-3">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{new Date(event.eventDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    <span>{[event.venueName, event.city, event.country].filter(Boolean).join(', ') || 'Venue TBA'}</span>
                  </div>
                  {event.contractAddress && (
                    <div className="flex items-center space-x-1.5 min-w-0 max-w-[240px]">
                      <ContractAddressRow
                        label="Contract:"
                        address={event.contractAddress}
                        className="text-xs font-mono text-zinc-500"
                        addressClassName="max-w-[140px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="space-y-2 border-t border-zinc-100 pt-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    About the Event
                  </h3>
                  <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Tiers / Tickets Section */}
              <div className="space-y-4 border-t border-zinc-100 pt-6">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Available Ticket Tiers</span>
                </h2>
                {tiers.length === 0 ? (
                  <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded p-6 text-center text-xs font-mono text-zinc-500">
                    No ticket tiers are currently published for this event.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {tiers.map((tier) => (
                      <TierPurchase key={tier.id} tier={tier} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
