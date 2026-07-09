'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { getMe, getAdminOrganisation, updateAdminOrganisation, type AdminOrgDetails } from '@/lib/api';

export function OrgBrandingPanel() {
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [primary, setPrimary] = useState('#18181b');
  const [secondary, setSecondary] = useState('#71717a');

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Admin access required.');
          return;
        }
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

  if (loading) return <p className="text-xs font-mono text-silver py-8">Loading…</p>;
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 mx-auto text-silver" />
        <p className="text-xs text-silver mt-2">{error}</p>
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="space-y-4">
      <div className="bg-paper border border-mist rounded-xl p-5 space-y-4">
        <p className="text-xs font-mono text-graphite">
          Public site:{' '}
          <Link
            href={`/sites/${org.slug}`}
            className="text-ink font-bold inline-flex items-center gap-1 hover:underline"
          >
            /sites/{org.slug}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase text-silver">Primary color</label>
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-full h-10 mt-1 border border-mist rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-silver">Secondary color</label>
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="w-full h-10 mt-1 border border-mist rounded cursor-pointer"
            />
          </div>
        </div>
        <div className="rounded-lg p-6 text-white font-mono text-sm" style={{ backgroundColor: primary }}>
          Preview — {org.name}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper text-xs font-mono font-bold uppercase rounded-lg"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save branding'}
        </button>
      </div>
    </div>
  );
}
