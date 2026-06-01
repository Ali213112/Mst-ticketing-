'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CreditCard,
  AlertTriangle,
  History,
  Users,
  MapPin,
  Tag,
  ArrowLeft,
  Shield,
  FileCheck
} from 'lucide-react';

interface SidebarProps {
  type: 'platform' | 'admin';
}

export default function Sidebar({ type }: SidebarProps) {
  const pathname = usePathname();

  const platformItems = [
    { name: 'Overview', href: '/platform', icon: LayoutDashboard },
    { name: 'Organisations', href: '/platform/organisations', icon: Building2 },
    { name: 'Settlements', href: '/platform/settlements', icon: CreditCard },
    { name: 'Fraud Alerts', href: '/platform/fraud', icon: AlertTriangle },
    { name: 'Audit Logs', href: '/platform/audit', icon: History },
  ];

  const adminItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Venues', href: '/admin/venues', icon: MapPin },
    { name: 'Members & Roles', href: '/admin/members', icon: Users },
    { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
    { name: 'Finance & Settlements', href: '/admin/finance', icon: CreditCard },
  ];

  const menuItems = type === 'platform' ? platformItems : adminItems;

  const isActive = (href: string) => {
    if (href === '/platform' || href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-zinc-200 min-h-screen flex flex-col justify-between sticky top-0 h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
          <Link href="/" className="flex items-center space-x-2">
            <span className="h-7 w-7 bg-zinc-900 rounded flex items-center justify-center text-white font-bold text-xs">
              {type === 'platform' ? 'P' : 'A'}
            </span>
            <span className="font-mono font-bold tracking-tight text-sm text-zinc-900">
              {type === 'platform' ? 'PLATFORM ADMIN' : 'ORG ADMIN'}
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                  active
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Return to main site */}
      <div className="p-4 border-t border-zinc-200">
        <Link
          href="/events"
          className="flex items-center space-x-2 px-3 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Main Site</span>
        </Link>
      </div>
    </aside>
  );
}
