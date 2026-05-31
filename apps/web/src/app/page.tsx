import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 640 }}>
      <h1>TicketChain MST</h1>
      <p>Blockchain-powered NFT ticketing on MST Chain.</p>
      <ul>
        <li>
          <Link href="/events">Browse events &amp; buy tickets</Link>
        </li>
        <li>
          <Link href="/tickets">My tickets</Link>
        </li>
        <li>
          <Link href="/login">Sign in with Web3Auth</Link>
        </li>
      </ul>
      <p>
        API health:{' '}
        <a href="http://localhost:5000/health" target="_blank" rel="noreferrer">
          http://localhost:5000/health
        </a>
      </p>
    </main>
  );
}
