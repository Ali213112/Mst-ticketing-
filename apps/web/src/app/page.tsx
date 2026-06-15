'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Ticket,
  ShoppingBag,
  ScanLine,
  LogIn,
  Building2,
  LayoutDashboard,
  ArrowRight,
  Compass,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

const ATTENDEE_LINKS = [
  { href: '/events', title: 'Browse Events', icon: Calendar },
  { href: '/tickets', title: 'My Tickets', icon: Ticket },
  { href: '/marketplace', title: 'Marketplace', icon: ShoppingBag },
  { href: '/login', title: 'Sign In', icon: LogIn },
] as const;

const STAFF_LINKS = [
  { href: '/checkin', title: 'Check-in Scanner', icon: ScanLine },
  { href: '/admin', title: 'Org Admin', icon: Building2 },
  { href: '/platform', title: 'Platform Console', icon: LayoutDashboard },
] as const;

function NavButton({
  href,
  title,
  icon: Icon,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between rounded bg-zinc-900 px-4 py-2.5 text-xs font-mono font-bold text-white shadow-sm transition-colors hover:bg-zinc-800"
    >
      <span className="flex items-center space-x-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{title}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-zinc-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="space-y-2 text-center">
            <h1 className="font-mono text-3xl font-bold tracking-tight text-zinc-900">
              TICKETCHAIN MST
            </h1>
            <p className="mx-auto max-w-sm text-sm text-zinc-500">
              Blockchain-powered NFT ticketing on MST Chain. Browse events, manage your wallet,
              or open an admin console.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Attendee
              </p>
              <div className="space-y-2">
                {ATTENDEE_LINKS.map((item) => (
                  <NavButton key={item.href} {...item} />
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Staff &amp; Admin
                </p>
                <div className="space-y-2">
                  {STAFF_LINKS.map((item) => (
                    <NavButton key={item.href} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 rounded border border-zinc-200 bg-zinc-100 p-3 font-mono text-[11px] leading-relaxed text-zinc-500">
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <p>
              Your credentials generate an on-chain smart wallet automatically. No seed phrases,
              gas management, or transaction signatures are exposed.
            </p>
          </div>
        </motion.div>
      </main>
    </>
  );
}
