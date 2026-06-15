'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  Award,
  Gift,
  Copy,
  Check,
  Share2,
  Calendar,
  AlertCircle,
  ArrowRight,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getMe,
  listMyRewards,
  getReferralStats,
  updateProfile,
  logoutSession,
  type AuthUser,
  type LoyaltyReward,
  type ReferralStats,
} from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const inputClass =
    'w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400';
  const labelClass = 'text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400';

  useEffect(() => {
    void (async () => {
      try {
        const currentUser = await getMe();
        if (currentUser) {
          setUser(currentUser);
          setFirstName(currentUser.firstName ?? '');
          setLastName(currentUser.lastName ?? '');
          setPhoneNumber(currentUser.phoneNumber ?? '');
          const [rewardsData, refData] = await Promise.all([
            listMyRewards().catch(() => [] as LoyaltyReward[]),
            getReferralStats().catch(() => null)
          ]);
          setRewards(rewardsData);
          setReferral(refData);
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCopyLink = () => {
    if (!referral) return;
    const link = `${window.location.origin}/events?ref=${referral.referralCode}`;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role === 99) return;
    setSaving(true);
    setSettingsError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({ firstName, lastName, phoneNumber });
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaved(true);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const getRoleName = (role: number) => {
    switch (role) {
      case 99:
        return 'Platform Admin';
      case 3:
        return 'Super Admin';
      case 2:
        return 'Admin';
      case 1:
        return 'Volunteer';
      default:
        return 'Consumer';
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
              USER PROFILE
            </h1>
            <p className="text-zinc-500 text-sm max-w-lg">
              Manage your credentials, examine loyalty rewards on-chain, and check your ticket referral bonuses.
            </p>
          </div>
        </section>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 mt-8">
          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center space-y-2 text-zinc-400">
              <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              <span className="text-xs font-mono">Fetching profile...</span>
            </div>
          ) : !user ? (
            <div className="bg-white border border-zinc-200 rounded p-12 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-950">Authentication Required</h3>
                <p className="text-xs text-zinc-500">
                  Please sign in to access your dashboard and rewards wallet.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white rounded text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                {user.role !== 99 && (
                  <form onSubmit={(e) => void handleSaveSettings(e)} className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                      <Settings className="w-4 h-4" />
                      <span>Account settings</span>
                    </h3>

                    <div className="space-y-1">
                      <label className={labelClass}>Email</label>
                      <input className={`${inputClass} opacity-60`} value={user.email} readOnly />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>First name</label>
                        <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Last name</label>
                        <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className={labelClass}>Phone number</label>
                      <input className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+919876543210" />
                    </div>

                    {settingsError && (
                      <p className="text-xs text-red-600 font-mono">{settingsError}</p>
                    )}
                    {saved && (
                      <p className="text-xs text-green-700 font-mono">Settings saved.</p>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-zinc-900 text-white py-2 rounded text-xs font-mono font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save settings'}
                    </button>
                  </form>
                )}

                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-800 border border-zinc-200">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-mono uppercase tracking-tight text-zinc-950">
                        {getRoleName(user.role)}
                      </h3>
                      <p className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">{user.email}</p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-4 space-y-3">
                    {/* Custodial Wallet address */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                        Custodial Wallet
                      </span>
                      <p className="text-xs font-mono text-zinc-700 break-all bg-zinc-50 border border-zinc-100 rounded p-2 select-all">
                        {user.walletAddress}
                      </p>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center justify-between text-xs font-mono pt-1 text-zinc-600">
                      <span>SECURE ROLE:</span>
                      <span className="text-zinc-900 font-semibold px-2 py-0.5 border border-zinc-200 rounded bg-zinc-50">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-zinc-200 text-zinc-600 rounded text-xs font-mono font-bold hover:bg-zinc-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </div>

                {/* Referral stats */}
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <Share2 className="w-4 h-4" />
                    <span>Referrals</span>
                  </h3>

                  {referral ? (
                    <div className="space-y-4">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-zinc-100 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-zinc-400">TOTAL SIGNUPS</span>
                          <p className="font-bold text-zinc-900">{referral.referralsCount}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] text-zinc-400">REWARDS EARNED</span>
                          <p className="font-bold text-zinc-900">{referral.rewardsCount}</p>
                        </div>
                      </div>

                      {/* Code Share */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                          Your Invite Link
                        </span>
                        <div className="flex space-x-1">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/events?ref=${referral.referralCode}`}
                            className="flex-1 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded text-xs font-mono select-all text-zinc-600 truncate focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded flex items-center justify-center transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-zinc-400 border border-dashed border-zinc-200 p-4 text-center rounded">
                      Referral stats unavailable.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Loyalty Rewards lists */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white border border-zinc-200 rounded p-6 space-y-6">
                  {/* Title */}
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                      <Award className="w-4 h-4" />
                      <span>Post-event collectibles gallery</span>
                    </h2>
                    <span className="text-xs text-zinc-500 font-mono font-semibold">
                      {rewards.length} Collected
                    </span>
                  </div>

                  {/* List of badges */}
                  {rewards.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <Gift className="w-8 h-8 text-zinc-200 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono font-bold uppercase text-zinc-500">
                          Loyalty list empty
                        </h4>
                        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                          Check in to events at the gate to earn digital attendance collectables and future ticket discount tokens.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {rewards.map((reward) => (
                        <div
                          key={reward.id}
                          className="border border-zinc-200 hover:border-zinc-400 rounded p-4 flex items-start space-x-3 transition-colors bg-white"
                        >
                          <div className="p-2 bg-zinc-50 rounded border border-zinc-100 text-zinc-800 mt-0.5">
                            {reward.rewardType === 'attendance_badge' ? (
                              <Award className="w-4 h-4" />
                            ) : (
                              <Gift className="w-4 h-4" />
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h4 className="font-bold font-mono text-zinc-950 uppercase text-xs truncate">
                              {reward.rewardMetadata?.badge_name ?? reward.rewardType.replace('_', ' ')}
                            </h4>
                            <div className="space-y-0.5 text-[10px] text-zinc-400 font-mono">
                              {reward.rewardMetadata?.event_date && (
                                <p className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-zinc-300" />
                                  <span>{reward.rewardMetadata.event_date}</span>
                                </p>
                              )}
                              {reward.rewardMetadata?.tier && (
                                <p>Tier: {reward.rewardMetadata.tier}</p>
                              )}
                              {reward.tokenId !== null && (
                                <p className="truncate">NFT ID: #{reward.tokenId}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
