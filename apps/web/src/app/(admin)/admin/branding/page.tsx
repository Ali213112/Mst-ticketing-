'use client';

import { useEffect, useState } from 'react';
import { Palette, AlertCircle, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  getMe,
  getAdminOrganisation,
  updateAdminOrganisation,
  type AuthUser,
  type AdminOrgDetails,
} from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminBrandingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [primary, setPrimary] = useState('#18181b');
  const [secondary, setSecondary] = useState('#71717a');
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Admin access required.');
          return;
        }
        setUser(me);
        const data = await getAdminOrganisation();
        setOrg(data);
        setPrimary(data.brandPrimaryColor ?? '#18181b');
        setSecondary(data.brandSecondaryColor ?? '#71717a');
      } catch {
        setError('Failed to load branding settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateAdminOrganisation({
        brandPrimaryColor: primary,
        brandSecondaryColor: secondary,
      });
      setOrg(updated);
      setSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            White-label branding
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>
        <main className="flex-1 p-8 max-w-2xl space-y-8">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 mt-2">{error}</p>
            </div>
          ) : loading ? (
            <div className="text-xs font-mono text-zinc-400 text-center py-12">Loading…</div>
          ) : (
            <>
              {org && (
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <p className="text-xs font-mono text-zinc-500">
                    Public branded site:{' '}
                    <Link
                      href={`/sites/${org.slug}`}
                      className="text-zinc-900 font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      /sites/{org.slug}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400">Primary color</label>
                      <input
                        type="color"
                        value={primary}
                        onChange={(e) => setPrimary(e.target.value)}
                        className="w-full h-10 mt-1 border border-zinc-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400">Secondary color</label>
                      <input
                        type="color"
                        value={secondary}
                        onChange={(e) => setSecondary(e.target.value)}
                        className="w-full h-10 mt-1 border border-zinc-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div
                    className="rounded p-6 text-white font-mono text-sm"
                    style={{ backgroundColor: primary }}
                  >
                    Preview — {org.name}
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded"
                  >
                    {saved ? <Check className="w-3.5 h-3.5" /> : null}
                    {saving ? 'Saving…' : saved ? 'Saved' : 'Save branding'}
                  </button>
                </div>
              )}

              <div className="bg-white border border-zinc-200 rounded p-6 space-y-3">
                <h3 className="font-mono font-bold text-sm">Custom domain (Phase 3)</h3>
                <p className="text-xs text-zinc-500">
                  Point a CNAME from tickets.yourdomain.com to your Ticketchain org slug. DNS verification coming soon.
                </p>
                <input
                  placeholder="tickets.yourorg.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
                  disabled
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
