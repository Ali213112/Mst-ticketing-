import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TierPurchase } from '@/components/TierPurchase';
import { getEvent } from '@/lib/api';

export default async function EventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const event = await getEvent(params.eventId);
  if (!event) notFound();

  const tiers = event.tiers ?? [];

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 720 }}>
      <p>
        <Link href="/events">← All events</Link>
      </p>

      <h1>{event.name}</h1>
      <p style={{ color: '#555' }}>
        {[event.venueName, event.city, event.country].filter(Boolean).join(' · ')} ·{' '}
        {new Date(event.eventDate).toLocaleString()}
      </p>

      {event.description && <p>{event.description}</p>}

      <h2>Tickets</h2>
      {tiers.length === 0 ? (
        <p>No ticket tiers available.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tiers.map((tier) => (
            <TierPurchase key={tier.id} tier={tier} />
          ))}
        </div>
      )}

      <p style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
        <Link href="/login">Sign in</Link> to purchase · <Link href="/tickets">My tickets</Link>
      </p>
    </main>
  );
}
