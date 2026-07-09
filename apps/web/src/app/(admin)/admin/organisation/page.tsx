'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CreditCard,
  Palette,
  Settings,
  Tag,
  Users,
} from 'lucide-react';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { OrgSettingsPanel } from '@/components/admin/org/OrgSettingsPanel';
import { OrgBrandingPanel } from '@/components/admin/org/OrgBrandingPanel';
import { OrgMembersPanel } from '@/components/admin/org/OrgMembersPanel';
import { OrgPromoPanel } from '@/components/admin/org/OrgPromoPanel';
import { OrgFinancePanel } from '@/components/admin/org/OrgFinancePanel';

const TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'promo', label: 'Promo codes', icon: Tag },
  { id: 'finance', label: 'Finance', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

function OrganisationHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'settings'
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam as TabId);
    }
  }, [tabParam]);

  const selectTab = useCallback(
    (id: TabId) => {
      setTab(id);
      router.replace(`/admin/organisation?tab=${id}`, { scroll: false });
    },
    [router]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <Building2 className="w-4 h-4 text-silver" />
        <p className="text-[10px] font-mono uppercase tracking-wider text-silver">Organisation</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-mist pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-ink text-ink'
                  : 'border-transparent text-silver hover:text-graphite'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="pt-2">
        {tab === 'settings' && <OrgSettingsPanel />}
        {tab === 'branding' && <OrgBrandingPanel />}
        {tab === 'members' && <OrgMembersPanel />}
        {tab === 'promo' && <OrgPromoPanel />}
        {tab === 'finance' && <OrgFinancePanel />}
      </div>
    </div>
  );
}

export default function OrganisationPage() {
  return (
    <AdminPageShell className="max-w-5xl w-full mx-auto">
      <Suspense fallback={<p className="text-xs font-mono text-silver py-8">Loading…</p>}>
        <OrganisationHubInner />
      </Suspense>
    </AdminPageShell>
  );
}
