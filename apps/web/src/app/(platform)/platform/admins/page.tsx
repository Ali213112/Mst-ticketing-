'use client';

import { useEffect, useState } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { getMe, getPlatformAdmins, type AuthUser } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function PlatformAdminsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admins, setAdmins] = useState<Awaited<ReturnType<typeof getPlatformAdmins>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          setError('Platform admin required.');
          return;
        }
        setUser(me);
        setAdmins(await getPlatformAdmins());
      } catch {
        setError('Failed to load platform admins.');
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
            <Users className="w-4 h-4" />
            Platform staff
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>
        <main className="flex-1 p-8 max-w-4xl">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 mt-2">{error}</p>
            </div>
          ) : loading ? (
            <div className="text-xs font-mono text-zinc-400 text-center py-12">Loading…</div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-zinc-50 border-b text-zinc-400 uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-zinc-400">No platform admins found.</td>
                    </tr>
                  ) : (
                    admins.map((a) => (
                      <tr key={a.id} className="border-b border-zinc-100">
                        <td className="px-4 py-3 font-bold">{a.email}</td>
                        <td className="px-4 py-3">
                          {[a.firstName, a.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-4 py-3 capitalize">{a.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
