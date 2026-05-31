import Link from 'next/link';
import { listEvents } from '@/lib/api';

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 720 }}>
      <p>
        <Link href="/">← Home</Link>
      </p>
      <h1>Browse events</h1>

      {events.length === 0 ? (
        <p>No published events yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
          {events.map((event) => (
            <li
              key={event.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}
            >
              <h2 style={{ margin: '0 0 0.5rem' }}>
                <Link href={`/events/${event.id}`}>{event.name}</Link>
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>
                {[event.city, event.country].filter(Boolean).join(', ') || 'Venue TBA'} ·{' '}
                {new Date(event.eventDate).toLocaleString()}
              </p>
              {event.category && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>{event.category}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
