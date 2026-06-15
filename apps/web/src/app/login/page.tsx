'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Web3AuthLogin } from '@/components/Web3AuthLogin';
import Navbar from '@/components/layout/Navbar';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWithAuth, getMe, getPostLoginPath } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function LoginPage() {
  const router = useRouter();
  const [showPlatformLogin, setShowPlatformLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showPlatformLogin) return;
    void (async () => {
      const me = await getMe();
      if (me) {
        router.replace(getPostLoginPath(me.role));
      }
    })();
  }, [router, showPlatformLogin]);

  const handlePlatformLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/auth/platform-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      window.location.href = '/platform';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-zinc-50 flex flex-col justify-center items-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-mono">
              {showPlatformLogin ? 'PLATFORM PORTAL' : 'SIGN IN'}
            </h1>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
              {showPlatformLogin
                ? 'Sign in with your administrator credentials.'
                : 'Access your digital ticket wallet, purchase event passes, or manage scanning devices securely.'}
            </p>
          </div>

          {showPlatformLogin ? (
            <form onSubmit={handlePlatformLogin} className="bg-white border border-zinc-200 rounded p-6 space-y-4 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ticketchain.com"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-red-650 font-mono bg-red-50 border border-red-100 p-2 rounded">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-mono font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all"
              >
                {loading ? 'Authenticating...' : 'Sign In as Platform Admin'}
              </button>
            </form>
          ) : (
            <Web3AuthLogin />
          )}

          {/* Switcher & Banner */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowPlatformLogin(!showPlatformLogin);
                setError(null);
              }}
              className="w-full text-center text-xs font-mono font-bold text-zinc-500 hover:text-zinc-900 transition-colors py-1 hover:underline"
            >
              {showPlatformLogin ? '← Back to Web3Auth Wallet' : 'Platform Administrator Portal →'}
            </button>

            <div className="flex items-start space-x-2.5 bg-zinc-100 border border-zinc-200 rounded p-3 text-[11px] text-zinc-500 font-mono leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <p>
                Your credentials generate an on-chain smart wallet automatically. No seed phrases, gas management, or transaction signatures are exposed.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}
