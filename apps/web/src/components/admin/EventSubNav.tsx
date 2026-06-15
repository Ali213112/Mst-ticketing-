'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Ticket, UserCheck, Settings2 } from 'lucide-react';

interface EventSubNavProps {
  eventId: string;
  eventName?: string;
}

export default function EventSubNav({ eventId, eventName }: EventSubNavProps) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;

  const links = [
    { href: base, label: 'Setup', icon: Settings2, exact: true },
    { href: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `${base}/tickets`, label: 'Tickets', icon: Ticket },
    { href: `${base}/checkins`, label: 'Check-ins', icon: UserCheck },
  ];

  return (
    <div className="space-y-3">
      {eventName && (
        <h1 className="text-lg font-bold font-mono text-zinc-950 tracking-tight">{eventName}</h1>
      )}
      <nav className="flex flex-wrap gap-1 border-b border-zinc-200 pb-3">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
