'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TAB_MAP: Record<string, string> = {
  settings: 'settings',
  branding: 'branding',
  members: 'members',
  'promo-codes': 'promo',
  finance: 'finance',
};

export default function RedirectToOrganisation({ tab }: { tab: string }) {
  const router = useRouter();

  useEffect(() => {
    const mapped = TAB_MAP[tab] ?? tab;
    router.replace(`/admin/organisation?tab=${mapped}`);
  }, [router, tab]);

  return null;
}
