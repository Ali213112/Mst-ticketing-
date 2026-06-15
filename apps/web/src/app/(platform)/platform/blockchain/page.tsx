'use client';

import { useEffect, useState } from 'react';
import { Link2, AlertCircle, RefreshCw } from 'lucide-react';
import { getMe, getBlockchainHealth, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformBlockchainPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getBlockchainHealth>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setHealth(await getBlockchainHealth());
  };

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          setError('Platform admin required.');
          return;
        }
        setUser(me);
        await refresh();
      } catch {
        setError('Failed to load blockchain health.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <Link2 className="w-4 h-4" />
            Blockchain health
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>
        <main className="flex-1 p-8 max-w-2xl space-y-6">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 mt-2">{error}</p>
            </div>
          ) : loading || !health ? (
            <div className="text-xs font-mono text-zinc-400 text-center py-12">Loading…</div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-900"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <div className="bg-white border border-zinc-200 rounded p-6 space-y-4 text-xs font-mono">
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                  <span className="text-zinc-400 uppercase">RPC health</span>
                  <span className={`font-bold ${health.rpcHealth === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                    {health.rpcHealth.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                  <span className="text-zinc-400 uppercase">Chain ID</span>
                  <span className="font-bold">{health.chainId}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-3">
                  <span className="text-zinc-400 uppercase">RPC URL</span>
                  <span className="font-bold truncate max-w-[200px]">{health.rpcUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase">Deployer configured</span>
                  <span className="font-bold">{health.deployerConfigured ? 'YES' : 'NO'}</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
