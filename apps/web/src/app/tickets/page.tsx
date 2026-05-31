'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMe, listMyTickets, type TicketSummary } from '@/lib/api';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    void (async () => {
      const me = await getMe();
      if (!me) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      const rows = await listMyTickets();
      setTickets(rows);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 720 }}>
      <p>
        <Link href="/events">← Browse events</Link>
      </p>
      <h1>My tickets</h1>

      {loading && <p>Loading…</p>}

      {needsLogin && (
        <p>
          Please <Link href="/login">sign in</Link> to view your tickets.
        </p>
      )}

      {!loading && !needsLogin && tickets.length === 0 && (
        <p>You have no tickets yet. <Link href="/events">Browse events</Link></p>
      )}

      {!loading && tickets.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}
            >
              <p style={{ margin: 0 }}>
                <strong>Ticket #{ticket.tokenId}</strong> · {ticket.status}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#555' }}>
                Event:{' '}
                <Link href={`/events/${ticket.eventId}`}>{ticket.eventId.slice(0, 8)}…</Link>
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                Contract: {ticket.contractAddress}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
