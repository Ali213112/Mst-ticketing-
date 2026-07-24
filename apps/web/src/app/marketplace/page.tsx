'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Loader2,
  AlertCircle,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { listResaleMarketplace, buyResaleListing, getMe, type ResaleListing } from '@/lib/api';
import { newIdempotencyKey } from '@/lib/idempotency';
import Navbar from '@/components/layout/Navbar';
import { PublicListToolbar, FilterChip, ClearFiltersButton } from '@/components/public/PublicListToolbar';

type MarkupFilter = 'all' | 'face' | 'premium';

function sortListingsByRecent(listings: ResaleListing[]): ResaleListing[] {
  return [...listings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [search, setSearch] = useState('');
  const [markupFilter, setMarkupFilter] = useState<MarkupFilter>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchListings = async () => {
    try {
      const me = await getMe();
      setIsLoggedIn(!!me);
      const data = await listResaleMarketplace();
      setListings(sortListingsByRecent(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    let result = [...listings];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.ticketId.toLowerCase().includes(q) ||
          l.eventId.toLowerCase().includes(q) ||
          l.sellerWallet.toLowerCase().includes(q)
      );
    }
    if (markupFilter === 'face') {
      result = result.filter((l) => Number(l.askPriceWei) <= Number(l.facePriceWei));
    } else if (markupFilter === 'premium') {
      result = result.filter((l) => Number(l.askPriceWei) > Number(l.facePriceWei));
    }
    return sortListingsByRecent(result);
  }, [listings, search, markupFilter]);

  const hasActiveFilters = Boolean(search || markupFilter !== 'all');

  const handleBuy = async (listingId: string) => {
    if (!isLoggedIn) {
      setError('Please sign in before purchasing tickets.');
      return;
    }
    setActionLoading(listingId);
    setError(null);
    setSuccessId(null);
    try {
      await buyResaleListing({
        listingId,
        idempotencyKey: newIdempotencyKey('buy-resale'),
      });
      setSuccessId(listingId);
      setTimeout(() => {
        setSuccessId(null);
        void fetchListings();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="bg-zinc-50 min-h-[calc(100vh-4rem)] pb-16">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <PublicListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search listings, tickets, sellers…"
            hasActiveFilters={hasActiveFilters}
            filterPanel={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 w-full sm:w-auto">
                  Listing type
                </span>
                <FilterChip active={markupFilter === 'all'} onClick={() => setMarkupFilter('all')}>
                  All
                </FilterChip>
                <FilterChip active={markupFilter === 'face'} onClick={() => setMarkupFilter('face')}>
                  Face value or below
                </FilterChip>
                <FilterChip active={markupFilter === 'premium'} onClick={() => setMarkupFilter('premium')}>
                  With premium
                </FilterChip>
                {hasActiveFilters && (
                  <ClearFiltersButton
                    onClick={() => {
                      setSearch('');
                      setMarkupFilter('all');
                    }}
                  />
                )}
              </div>
            }
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {error.includes('sign in') && (
                  <Link href="/login" className="underline font-semibold block text-[10px] uppercase">
                    Go to Sign In
                  </Link>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading listings…</span>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center space-y-4">
              <ShoppingBag className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">No listings found</h3>
                <p className="text-xs text-zinc-500">
                  {listings.length === 0
                    ? 'No active resale listings right now.'
                    : 'Try adjusting your search or filters.'}
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center px-4 py-2 border border-zinc-900 text-zinc-900 text-xs font-mono font-bold uppercase hover:bg-zinc-900 hover:text-white transition-colors rounded-lg"
              >
                Browse events
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredListings.map((listing) => {
                const faceMSTC = Number(listing.facePriceWei) / 1e18;
                const askMSTC = Number(listing.askPriceWei) / 1e18;
                const percentChange = faceMSTC > 0 ? ((askMSTC - faceMSTC) / faceMSTC) * 100 : 0;
                const isBuying = actionLoading === listing.id;
                const isSuccess = successId === listing.id;

                return (
                  <motion.div
                    key={listing.id}
                    layout
                    className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl p-5 flex flex-col justify-between transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded uppercase">
                          Resale · {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                          #{listing.ticketId.slice(0, 8)}…
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-y border-zinc-100 py-3 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Face price</span>
                          <p className="font-bold text-zinc-600">{faceMSTC} tMSTC</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block">Ask price</span>
                          <p className="font-bold text-zinc-900">{askMSTC} tMSTC</p>
                        </div>
                      </div>

                      <p className="text-[10px] font-mono text-zinc-500">
                        {percentChange <= 0 ? 'At or below face value' : `+${percentChange.toFixed(1)}% premium`}
                      </p>
                    </div>

                    <div className="border-t border-zinc-50 pt-4 mt-4">
                      {isSuccess ? (
                        <div className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-100 text-zinc-950 rounded-lg text-xs font-mono font-bold uppercase border border-zinc-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Purchased
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => void handleBuy(listing.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 rounded-lg text-xs font-mono font-bold uppercase transition-colors"
                        >
                          {isBuying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Settling…
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" />
                              Buy · {askMSTC} tMSTC
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
