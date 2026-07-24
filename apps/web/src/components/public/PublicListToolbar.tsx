'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface PublicListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filtersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  hasActiveFilters?: boolean;
  filterPanel?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function PublicListToolbar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  filtersOpen: controlledOpen,
  onFiltersOpenChange,
  hasActiveFilters = false,
  filterPanel,
  trailing,
}: PublicListToolbarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const filtersOpen = controlledOpen ?? internalOpen;
  const setFiltersOpen = onFiltersOpenChange ?? setInternalOpen;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900/10"
          />
        </div>
        {filterPanel && (
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
              filtersOpen || hasActiveFilters
                ? 'border-zinc-900/30 bg-zinc-100 text-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        )}
        {trailing}
      </div>

      {filterPanel && filtersOpen && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">{filterPanel}</div>
      )}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
        active
          ? 'bg-zinc-900 text-white border-zinc-900'
          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
      }`}
    >
      {children}
    </button>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900"
    >
      <X className="w-3 h-3" />
      Clear
    </button>
  );
}
