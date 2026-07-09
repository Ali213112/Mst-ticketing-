'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Web3AuthLogin } from '@/components/Web3AuthLogin';
import type { AuthUser } from '@/lib/api';

interface AuthGateOverlayProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  title?: string;
  subtitle?: string;
}

export function AuthGateOverlay({
  open,
  onClose,
  onSuccess,
  title = 'Sign in to continue',
  subtitle = 'Create an account or sign in to purchase tickets.',
}: AuthGateOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      <button
        type="button"
        aria-label="Close sign in"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 id="auth-gate-title" className="text-base font-semibold text-zinc-950">
              {title}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <Web3AuthLogin
            embedded
            redirectOnSuccess={false}
            onSuccess={(user) => {
              onSuccess(user);
              onClose();
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
