'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, X, AlertCircle, Grid3x3 } from 'lucide-react';
import {
  getMe,
  getAdminVenues,
  createAdminVenue,
  deleteAdminVenue,
  type AuthUser,
  type VenueSummary,
} from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminVenuesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [capacity, setCapacity] = useState('');
  const [seatMapJson, setSeatMapJson] = useState('');

  const loadVenues = async () => {
    const data = await getAdminVenues();
    setVenues(data);
  };

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Admin access required.');
          return;
        }
        setUser(me);
        await loadVenues();
      } catch {
        setError('Failed to load venues.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let seatMap: unknown;
      if (seatMapJson.trim()) {
        seatMap = JSON.parse(seatMapJson) as unknown;
      }
      const venue = await createAdminVenue({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        seatMap,
      });
      setVenues((prev) => [venue, ...prev]);
      setShowForm(false);
      setName('');
      setAddress('');
      setCity('');
      setCountry('');
      setCapacity('');
      setSeatMapJson('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create venue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (venueId: string) => {
    if (!confirm('Delete this venue?')) return;
    try {
      await deleteAdminVenue(venueId);
      setVenues((prev) => prev.filter((v) => v.id !== venueId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Venues
          </h2>
          {user && (
            <span className="text-xs font-mono text-zinc-500">{user.email}</span>
          )}
        </header>

        <main className="flex-1 p-8 max-w-4xl space-y-6">
          {error ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
              <p className="text-xs text-zinc-500">{error}</p>
            </div>
          ) : loading ? (
            <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-400">Loading…</div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-zinc-500 font-mono">{venues.length} venue(s)</p>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add venue
                </button>
              </div>

              {venues.length === 0 ? (
                <div className="bg-white border border-dashed border-zinc-200 rounded p-12 text-center text-xs font-mono text-zinc-400">
                  No venues yet. Add your first venue to assign events and seat maps.
                </div>
              ) : (
                <div className="space-y-3">
                  {venues.map((v) => (
                    <motion.div
                      key={v.id}
                      layout
                      className="bg-white border border-zinc-200 rounded p-4 flex justify-between items-start"
                    >
                      <div className="space-y-1">
                        <h3 className="font-mono font-bold text-zinc-950">{v.name}</h3>
                        <p className="text-xs text-zinc-500">
                          {[v.address, v.city, v.country].filter(Boolean).join(', ') || 'No address'}
                        </p>
                        {v.capacity != null && (
                          <p className="text-[10px] font-mono text-zinc-400">Capacity: {v.capacity}</p>
                        )}
                        {v.seatMap != null && (
                          <p className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                            <Grid3x3 className="w-3 h-3" />
                            Seat map configured
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(v.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg border border-zinc-200 w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-mono font-bold text-sm">New venue</h3>
                <button type="button" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <input
                placeholder="Venue name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <input
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
                />
                <input
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
                />
              </div>
              <input
                placeholder="Capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <textarea
                placeholder='Seat map JSON (optional) e.g. {"sections":[{"id":"A","rows":10,"cols":20}]}'
                rows={4}
                value={seatMapJson}
                onChange={(e) => setSeatMapJson(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => void handleCreate()}
                className="w-full py-2 bg-zinc-900 text-white text-xs font-mono font-bold uppercase rounded disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create venue'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
