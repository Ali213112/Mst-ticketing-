'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Tag,
  Loader2,
  AlertCircle,
  Coins,
  CheckCircle2,
  Calendar,
  Compass,
  ArrowRight
} from 'lucide-react';
import { listResaleMarketplace, buyResaleListing, getMe, type ResaleListing } from '@/lib/api';
import { newIdempotencyKey } from '@/lib/idempotency';
import Navbar from '@/components/layout/Navbar';

export default function MarketplacePage() {
  const [listings, setListings] = useState<ResaleListing[]>([]);
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
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchListings();
  }, []);

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
        {/* Header Hero */}
        <section className="bg-white border-b border-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-mono">
              RESALE MARKETPLACE
            </h1>
            <p className="text-zinc-500 text-sm max-w-lg">
              Acquire tickets from other consumers. Price caps are locked on-chain at the smart contract level to prevent scalping.
            </p>
          </div>
        </section>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 mt-8">
          {error && (
            <div className="mb-6 flex items-start space-x-2 bg-red-50 text-red-700 p-3 rounded text-xs border border-red-100 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {error.includes('sign in') && (
                  <Link href="/login" className="underline font-semibold block text-[10px] uppercase tracking-wider">
                    Go to Sign In
                  </Link>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading resale listings...</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center space-y-4">
              <ShoppingBag className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">No listings active</h3>
                <p className="text-xs text-zinc-500">
                  There are currently no active resale listings. Check back later or browse standard events.
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex items-center space-x-1 px-4 py-2 border border-zinc-900 text-zinc-900 text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <span>Browse Primary Tickets</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map((listing) => {
                const faceMSTC = Number(listing.facePriceWei) / 1e18;
                const askMSTC = Number(listing.askPriceWei) / 1e18;
                const percentChange = ((askMSTC - faceMSTC) / faceMSTC) * 100;
                const isBuying = actionLoading === listing.id;
                const isSuccess = successId === listing.id;

                return (
                  <motion.div
                    key={listing.id}
                    layout
                    className="bg-white border border-zinc-200 hover:border-zinc-400 rounded p-6 flex flex-col justify-between transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded uppercase tracking-wider">
                            Listing ID #{listing.id.slice(0, 8)}...
                          </span>
                          <h3 className="font-bold font-mono text-zinc-950 uppercase text-sm tracking-tight pt-1">
                            SECONDARY TICKET RESALE
                          </h3>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">
                          Ticket ID: {listing.ticketId.slice(0, 8)}...
                        </span>
                      </div>

                      {/* Prices Compare */}
                      <div className="grid grid-cols-2 gap-4 border-y border-zinc-100 py-3 text-xs font-mono">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-zinc-400">ORIGINAL FACE PRICE</span>
                          <p className="font-bold text-zinc-600">{faceMSTC} tMSTC</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] text-zinc-400">ASKING RESALE PRICE</span>
                          <p className="font-bold text-zinc-900">{askMSTC} tMSTC</p>
                        </div>
                      </div>

                      {/* Scalping Index / Premium Marker */}
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-zinc-400">MARKUP COMPLIANCE:</span>
                        {percentChange <= 0 ? (
                          <span className="text-zinc-800 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                            FACE VALUE OR BELOW
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-medium">
                            +{percentChange.toFixed(1)}% premium
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-zinc-50 pt-4 mt-6">
                      {isSuccess ? (
                        <div className="w-full flex items-center justify-center space-x-1.5 py-2 bg-zinc-100 text-zinc-950 rounded text-xs font-mono font-bold uppercase border border-zinc-200">
                          <CheckCircle2 className="w-4 h-4 text-zinc-800" />
                          <span>Purchased successfully</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => void handleBuy(listing.id)}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 rounded text-xs font-mono font-bold uppercase transition-colors"
                        >
                          {isBuying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Settling on-chain...</span>
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" />
                              <span>BUY NOW ({askMSTC} tMSTC)</span>
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
