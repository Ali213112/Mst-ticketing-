'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  FileCheck,
  Wallet,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  getMe,
  getAdminOrganisation,
  updateAdminOrganisation,
  uploadOrgAsset,
  uploadKycDocument,
  submitOrgKyc,
  confirmOrgWallet,
  inviteAdminMember,
  getOnboardingStatus,
  inferFileMimeType,
  type AuthUser,
  type AdminOrgDetails,
  type OnboardingStatus,
} from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import OrgProfileEditor from '@/components/admin/OrgProfileEditor';
import { toDisplayImageUrl } from '@/lib/media';

const STEPS = [
  { id: 1, label: 'Public profile', icon: Building2 },
  { id: 2, label: 'KYC documents', icon: FileCheck },
  { id: 3, label: 'Payout wallet', icon: Wallet },
  { id: 4, label: 'Team & readiness', icon: Users },
];

const KYC_TYPES = [
  { type: 'registration_certificate' as const, label: 'Registration certificate' },
  { type: 'tax_id' as const, label: 'Tax ID / PAN' },
  { type: 'id_proof' as const, label: 'ID proof' },
  { type: 'address_proof' as const, label: 'Address proof' },
];

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState<'logo' | 'banner' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('#18181b');
  const [brandSecondary, setBrandSecondary] = useState('#71717a');

  const [kycUrls, setKycUrls] = useState<Record<string, string>>({});
  const [kycFileNames, setKycFileNames] = useState<Record<string, string>>({});
  const [kycLocalPreviews, setKycLocalPreviews] = useState<Record<string, string>>({});
  const [kycUploadErrors, setKycUploadErrors] = useState<Record<string, string>>({});
  const [kycUploading, setKycUploading] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState(2);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (!me || me.role < 2) {
          setError('Organisation admin access required.');
          setLoading(false);
          return;
        }
        setUser(me);
        setWalletAddress(me.walletAddress);

        const [orgData, onboarding] = await Promise.all([
          getAdminOrganisation(),
          getOnboardingStatus(),
        ]);
        setOrg(orgData);
        setStatus(onboarding);
        setDescription(orgData.description ?? '');
        setWebsiteUrl(orgData.websiteUrl ?? '');
        setBrandPrimary(orgData.brandPrimaryColor ?? '#18181b');
        setBrandSecondary(orgData.brandSecondaryColor ?? '#71717a');
        if (orgData.superAdminWalletAddress) {
          setWalletAddress(orgData.superAdminWalletAddress);
        }
      } catch {
        setError('Failed to load onboarding.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshStatus() {
    const onboarding = await getOnboardingStatus();
    setStatus(onboarding);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminOrganisation({
        description,
        websiteUrl: websiteUrl.trim() || undefined,
        brandPrimaryColor: brandPrimary,
        brandSecondaryColor: brandSecondary,
      });
      setOrg(updated);
      await refreshStatus();
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssetUpload(file: File, assetType: 'logo' | 'banner') {
    setAssetUploading(assetType);
    setError(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const { org: updated } = await uploadOrgAsset({
        fileName: file.name,
        mimeType: inferFileMimeType(file),
        contentBase64,
        assetType,
      });
      setOrg(updated);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setAssetUploading(null);
    }
  }

  async function handleKycFileUpload(type: string, file: File) {
    setKycUploading(type);
    setError(null);
    setKycUploadErrors((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    const isImage = inferFileMimeType(file).startsWith('image/');
    const localPreview = isImage ? URL.createObjectURL(file) : null;
    if (localPreview) {
      setKycLocalPreviews((prev) => ({ ...prev, [type]: localPreview }));
    }

    try {
      const contentBase64 = await fileToBase64(file);
      const mimeType = inferFileMimeType(file);
      const { url } = await uploadKycDocument({
        fileName: file.name,
        mimeType,
        contentBase64,
      });
      if (!url) {
        throw new Error('Upload succeeded but no document URL was returned');
      }
      setKycUrls((prev) => ({ ...prev, [type]: url }));
      setKycFileNames((prev) => ({ ...prev, [type]: file.name }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KYC upload failed';
      setKycUploadErrors((prev) => ({ ...prev, [type]: message }));
      setError(message);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setKycLocalPreviews((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
      }
    } finally {
      setKycUploading(null);
    }
  }

  const uploadedKycCount = KYC_TYPES.filter((d) => Boolean(kycUrls[d.type])).length;

  async function handleSubmitKyc() {
    if (kycUploading) {
      setError('Please wait for the current upload to finish.');
      return;
    }

    const documents = KYC_TYPES.filter((d) => kycUrls[d.type]).map((d) => ({
      type: d.type,
      label: d.label,
      url: kycUrls[d.type]!,
    }));
    if (documents.length === 0) {
      setError(
        uploadedKycCount === 0
          ? 'No documents uploaded yet. Select a file for at least one document type and wait until you see "Ready to submit" before continuing.'
          : 'Upload at least one KYC document.'
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitOrgKyc(documents);
      await refreshStatus();
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KYC submission failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmWallet() {
    if (!walletAddress.trim()) {
      setError('Wallet address is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const onboarding = await confirmOrgWallet(walletAddress.trim());
      setStatus(onboarding);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet confirmation failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await inviteAdminMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteName('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400">
            Organisation onboarding
          </h2>
          {user && (
            <span className="text-xs font-mono text-zinc-500">
              {user.email}
            </span>
          )}
        </header>

        <main className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-6">
          {error && !loading && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-mono p-3 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : error && !org ? (
            <div className="text-center text-xs font-mono text-zinc-500">{error}</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  const active = step === s.id;
                  const done = step > s.id;
                  return (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                          done ? 'bg-zinc-900 text-white border-zinc-900' :
                          active ? 'bg-white border-zinc-900 text-zinc-900' :
                          'bg-white border-zinc-200 text-zinc-400'
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 text-center hidden sm:block">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {status && (
                <div className="bg-white border border-zinc-200 rounded p-4 text-xs font-mono space-y-1">
                  <p>Profile: {status.profilePercent}% · KYC: {status.verificationStatus}</p>
                  <div className="h-1.5 bg-zinc-100 rounded overflow-hidden">
                    <div className="h-full bg-zinc-900 transition-all" style={{ width: `${status.profilePercent}%` }} />
                  </div>
                </div>
              )}

              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-zinc-200 rounded p-6 space-y-4"
              >
                {step === 1 && org && (
                  <>
                    <h3 className="text-sm font-mono font-bold uppercase">Step 1 — Public profile</h3>
                    <p className="text-xs text-zinc-500">
                      Set up how your organisation appears to ticket buyers. Click the pencil icon to edit any field, or hover the banner/logo to upload images.
                    </p>
                    <OrgProfileEditor
                      orgName={org.name}
                      orgSlug={org.slug}
                      city={org.city}
                      logoUrl={org.logoUrl}
                      bannerUrl={org.bannerUrl}
                      description={description}
                      websiteUrl={websiteUrl}
                      brandPrimaryColor={brandPrimary}
                      brandSecondaryColor={brandSecondary}
                      onDescriptionChange={setDescription}
                      onWebsiteChange={setWebsiteUrl}
                      onPrimaryColorChange={setBrandPrimary}
                      onSecondaryColorChange={setBrandSecondary}
                      onLogoUpload={(file) => handleAssetUpload(file, 'logo')}
                      onBannerUpload={(file) => handleAssetUpload(file, 'banner')}
                      uploading={assetUploading}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="text-sm font-mono font-bold uppercase">Step 2 — KYC submission</h3>
                    <p className="text-xs text-zinc-500">
                      Upload documents for platform verification. Wait for each file to show <strong>Ready to submit</strong> before clicking Submit KYC.
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500">
                      {uploadedKycCount} of {KYC_TYPES.length} documents ready
                    </p>
                    {KYC_TYPES.map((doc) => (
                      <div key={doc.type} className="space-y-2 border border-zinc-100 rounded-lg p-3 bg-zinc-50/40">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{doc.label}</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf,.pdf"
                          className="text-xs w-full"
                          disabled={kycUploading !== null}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleKycFileUpload(doc.type, f);
                            e.target.value = '';
                          }}
                        />
                        {kycUploading === doc.type && (
                          <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading {kycFileNames[doc.type] ?? 'file'}...
                          </p>
                        )}
                        {(kycLocalPreviews[doc.type] || kycUrls[doc.type]) && kycUploading !== doc.type && (
                          <div className="space-y-2">
                            {(kycLocalPreviews[doc.type] || toDisplayImageUrl(kycUrls[doc.type])) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={kycLocalPreviews[doc.type] ?? toDisplayImageUrl(kycUrls[doc.type])!}
                                alt={`${doc.label} preview`}
                                className="h-24 w-auto max-w-full rounded border border-zinc-200 object-contain bg-white"
                              />
                            )}
                            <p className="text-[10px] font-mono text-green-700">
                              ✓ Ready to submit — {kycFileNames[doc.type] ?? 'document uploaded'}
                            </p>
                          </div>
                        )}
                        {kycUploadErrors[doc.type] && (
                          <p className="text-[10px] font-mono text-red-600">{kycUploadErrors[doc.type]}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {step === 3 && (
                  <>
                    <h3 className="text-sm font-mono font-bold uppercase">Step 3 — Payout wallet</h3>
                    <p className="text-xs text-zinc-500">
                      Confirm the wallet that receives org royalties and settlements. This may differ from your login wallet.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Settlement wallet address</label>
                      <input className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
                    </div>
                    {status?.walletConfirmed && (
                      <p className="text-xs text-green-700 font-mono">Wallet already confirmed.</p>
                    )}
                  </>
                )}

                {step === 4 && (
                  <>
                    <h3 className="text-sm font-mono font-bold uppercase">Step 4 — Team & readiness</h3>
                    <ul className="text-xs font-mono space-y-1 text-zinc-600">
                      <li>{status?.profileComplete ? '✓' : '○'} Profile complete ({status?.profilePercent ?? 0}%)</li>
                      <li>{status?.kycSubmitted ? '✓' : '○'} KYC submitted</li>
                      <li>{status?.kycVerified ? '✓' : '○'} KYC verified by platform</li>
                      <li>{status?.walletConfirmed ? '✓' : '○'} Wallet confirmed</li>
                      <li>{status?.teamInvited ? '✓' : '○'} Team invited</li>
                    </ul>
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Invite team member</label>
                      <input className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono" placeholder="Name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                      <input className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      <div className="flex gap-2">
                        {[2, 1].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setInviteRole(r)}
                            className={`flex-1 py-1.5 text-[10px] font-mono font-bold border rounded ${
                              inviteRole === r ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600'
                            }`}
                          >
                            {r === 2 ? 'Admin' : 'Volunteer'}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleInvite()}
                        disabled={saving || !inviteEmail.trim()}
                        className="w-full bg-zinc-100 text-zinc-900 py-2 rounded text-xs font-mono font-bold"
                      >
                        Send invite
                      </button>
                    </div>
                    {status?.readyForEvents && (
                      <Link
                        href="/admin/events"
                        className="block text-center w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-mono font-bold"
                      >
                        Create your first event →
                      </Link>
                    )}
                  </>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    disabled={step === 1 || saving}
                    onClick={() => setStep((s) => s - 1)}
                    className="flex items-center text-xs font-mono text-zinc-600 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  {step === 1 && (
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={saving}
                      className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & continue <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  )}
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => void handleSubmitKyc()}
                      disabled={saving || kycUploading !== null || uploadedKycCount === 0}
                      className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit KYC ({uploadedKycCount}) <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      type="button"
                      onClick={() => void handleConfirmWallet()}
                      disabled={saving}
                      className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirm wallet <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  )}
                  {step === 4 && (
                    <button
                      type="button"
                      onClick={() => router.push('/admin')}
                      className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold"
                    >
                      Go to dashboard
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
