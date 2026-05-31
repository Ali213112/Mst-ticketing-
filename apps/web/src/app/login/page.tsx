import { Web3AuthLogin } from '@/components/Web3AuthLogin';

export default function LoginPage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 520 }}>
      <h1>Sign in</h1>
      <p style={{ marginBottom: '1.5rem', color: '#555' }}>
        Log in with email or phone. Web3Auth creates your custodial wallet automatically.
      </p>
      <Web3AuthLogin />
    </main>
  );
}
