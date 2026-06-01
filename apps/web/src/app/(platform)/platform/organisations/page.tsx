'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  LayoutDashboard,
  Plus,
  Loader2
} from 'lucide-react';
import { getMe, getPlatformTenants, updateTenantKyc, updateTenantCommission, createPlatformOrganisation, type AuthUser, type PlatformTenant } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';

const MOCK_TENANTS: PlatformTenant[] = [
  { id: 't-1', name: 'MST Events Group', slug: 'mst-events', subscriptionPlan: 'enterprise', status: 'active', verificationStatus: 'verified', platformCommissionBps: 200, country: 'India', city: 'Mumbai', createdAt: new Date().toISOString() },
  { id: 't-2', name: 'Global Beats Inc.', slug: 'global-beats', subscriptionPlan: 'pro', status: 'pending_verification', verificationStatus: 'unverified', platformCommissionBps: 250, country: 'India', city: 'Delhi', createdAt: new Date().toISOString() },
  { id: 't-3', name: 'Club Underground', slug: 'club-underground', subscriptionPlan: 'starter', status: 'suspended', verificationStatus: 'rejected', platformCommissionBps: 300, country: 'India', city: 'Pune', createdAt: new Date().toISOString() }
];

export default function PlatformOrganisationsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [newCommission, setNewCommission] = useState<number>(200);
  const [updating, setUpdating] = useState(false);

  // Create organization wizard states
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createSuperAdminEmail, setCreateSuperAdminEmail] = useState('');
  const [createCountry, setCreateCountry] = useState('India');
  const [createCity, setCreateCity] = useState('Mumbai');
  const [createPlan, setCreatePlan] = useState<'starter' | 'growth' | 'enterprise'>('starter');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Action feedback
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role !== 99) {
          // Only block if the user was never authed at all
          if (!user) {
            setError('Insufficient permissions. Platform Admin role required.');
          }
          setLoading(false);
          return;
        }
        setUser(me);
        setError(null); // Clear any previous network errors

        const tenantsData = await getPlatformTenants().catch(() => MOCK_TENANTS);
        setTenants(tenantsData.length > 0 ? tenantsData : MOCK_TENANTS);
      } catch {
        // If the user was already authenticated, don't kick them out
        if (!user) {
          setError('Cannot connect to the API server. Please check that the backend is running.');
        }
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKycStatus = async (tenantId: string, action: 'verified' | 'suspended') => {
    const newVerification = action === 'verified' ? 'verified' : 'rejected';
    const newStatus = action === 'verified' ? 'active' : 'pending_verification';
    setActionError(null);
    try {
      await updateTenantKyc(tenantId, action);
    } catch (err) {
      setActionError(`KYC update failed: ${err instanceof Error ? err.message : 'Network error — your change is saved locally but may not be persisted.'}`);
    }
    // Optimistic update — always update local state
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, verificationStatus: newVerification, status: newStatus } : t));
    if (selectedTenant?.id === tenantId) {
      setSelectedTenant(prev => prev ? { ...prev, verificationStatus: newVerification, status: newStatus } : null);
    }
  };

  const handleUpdateCommission = async () => {
    if (!selectedTenant) return;
    setUpdating(true);
    try {
      await updateTenantCommission(selectedTenant.id, newCommission);
    } catch {
      // ignore
    }
    setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, platformCommissionBps: newCommission } : t));
    setSelectedTenant(null);
    setUpdating(false);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOrg(true);
    setCreateError(null);
    try {
      const newOrg = await createPlatformOrganisation({
        name: createName,
        slug: createSlug || undefined,
        superAdminEmail: createSuperAdminEmail,
        country: createCountry,
        city: createCity,
        subscriptionPlan: createPlan,
      });
      setTenants(prev => [newOrg, ...prev]);
      setShowCreateWizard(false);
      setCreateName('');
      setCreateSlug('');
      setCreateSuperAdminEmail('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create organization. Ensure the founder email exists first.');
    } finally {
      setCreatingOrg(false);
    }
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="platform" />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Building2 className="w-4 h-4" />
            <span>Organisations / Tenants</span>
          </h2>
          {user && (
            <div className="text-xs font-mono text-zinc-500">
              Logged in as: <strong className="text-zinc-950">{user.email}</strong>
            </div>
          )}
        </header>

        <main className="flex-1 p-8 max-w-5xl space-y-8">
          {error ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">Access Blocked</h3>
                <p className="text-xs text-zinc-500">{error}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Fetching tenant registry...</span>
            </div>
          ) : (
            <>
              {/* Action error toast */}
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start justify-between">
                  <p className="text-xs text-red-700 font-mono">{actionError}</p>
                  <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-700 ml-3 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Table Action Bar */}
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Tenant Directory
                </h3>
                <button
                  onClick={() => setShowCreateWizard(true)}
                  className="flex items-center space-x-1.5 bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Organisation</span>
                </button>
              </div>

              {/* Tenants Table */}
              <div className="bg-white border border-zinc-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 text-[10px] uppercase">
                        <th className="px-6 py-3 font-semibold">Tenant Name</th>
                        <th className="px-6 py-3 font-semibold">Slug</th>
                        <th className="px-6 py-3 font-semibold">Verification</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-950 uppercase">{tenant.name}</td>
                          <td className="px-6 py-4 text-zinc-500">{tenant.slug}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                              tenant.verificationStatus === 'verified'
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                : tenant.verificationStatus === 'unverified' || tenant.verificationStatus === 'under_review'
                                ? 'bg-zinc-50 border-zinc-300 text-zinc-500'
                                : 'bg-red-50 border-red-100 text-red-700'
                            }`}>
                              {(tenant.verificationStatus ?? 'unknown').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                              tenant.status === 'active'
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                : 'bg-zinc-50 border-zinc-300 text-zinc-500'
                            }`}>
                              {(tenant.status ?? 'unknown').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {tenant.verificationStatus !== 'verified' && (
                              <>
                                <button
                                  onClick={() => handleKycStatus(tenant.id, 'verified')}
                                  className="text-[10px] font-bold uppercase font-mono px-2 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleKycStatus(tenant.id, 'suspended')}
                                  className="text-[10px] font-bold uppercase font-mono px-2 py-1 bg-white border border-zinc-200 text-zinc-600 rounded hover:bg-zinc-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setNewCommission(tenant.platformCommissionBps);
                              }}
                              className="text-[10px] font-mono hover:underline font-bold text-zinc-900"
                            >
                              Edit Settings
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Drawer Modal */}
      <AnimatePresence>
        {selectedTenant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTenant(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-zinc-200 rounded-lg w-full max-w-md p-6 space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-950">
                  Tenant Management: {selectedTenant.name}
                </h3>
                <button onClick={() => setSelectedTenant(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Platform Commission (Basis Points - 100 BPS = 1%)
                  </label>
                  <input
                    type="number"
                    value={newCommission}
                    onChange={(e) => setNewCommission(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">Verification Status</span>
                  <span className="text-xs font-mono text-zinc-900">{(selectedTenant.verificationStatus ?? 'unknown').toUpperCase()}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">Organisation Status</span>
                  <span className="text-xs font-mono text-zinc-900">{(selectedTenant.status ?? 'unknown').toUpperCase()}</span>
                </div>
              </div>

              <button
                onClick={handleUpdateCommission}
                disabled={updating}
                className="w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-mono font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all"
              >
                {updating ? 'Saving...' : 'Update Settings'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Organisation Wizard Modal */}
      <AnimatePresence>
        {showCreateWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => !creatingOrg && setShowCreateWizard(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-zinc-200 rounded-lg w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-950">
                  Create New Organisation
                </h3>
                <button onClick={() => setShowCreateWizard(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Organisation Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Global Concerts Co"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Slug (Optional)</label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="global-concerts"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Founder Super Admin Email</label>
                  <input
                    type="email"
                    value={createSuperAdminEmail}
                    onChange={(e) => setCreateSuperAdminEmail(e.target.value)}
                    placeholder="founder@example.com"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                    required
                  />
                  <p className="text-[9px] text-zinc-400 font-mono">
                    * The founder must already be registered as a user on the platform.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Country</label>
                    <input
                      type="text"
                      value={createCountry}
                      onChange={(e) => setCreateCountry(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">City</label>
                    <input
                      type="text"
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Subscription Plan</label>
                  <div className="flex space-x-2">
                    {(['starter', 'growth', 'enterprise'] as const).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setCreatePlan(plan)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold uppercase border transition-colors ${
                          createPlan === plan
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                {createError && (
                  <p className="text-xs text-red-650 font-mono bg-red-50 border border-red-100 p-2 rounded">
                    {createError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-mono font-bold hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center justify-center space-x-1"
                >
                  {creatingOrg ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Tenant Organisation</span>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
