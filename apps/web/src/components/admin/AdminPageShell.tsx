'use client';

import Sidebar from '@/components/layout/Sidebar';

export function AdminPageShell({
  children,
  className = 'max-w-6xl w-full mx-auto',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex bg-paper min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <main className={`flex-1 p-4 sm:p-6 ${className}`}>{children}</main>
      </div>
    </div>
  );
}
