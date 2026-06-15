'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Settings, Check } from 'lucide-react';
import {
  getMe,
  getAdminOrganisation,
  updateAdminOrganisation,
  uploadOrgAsset,
  inferFileMimeType,
  type AuthUser,
  type AdminOrgDetails,
  type OrgType,
} from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import OrgProfileEditor from '@/components/admin/OrgProfileEditor';
import OrgLegalEditor, { type LegalFormState } from '@/components/admin/OrgLegalEditor';

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export default function AdminSettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AdminOrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState<'logo' | 'banner' | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    websiteUrl: '',
    brandPrimaryColor: '#18181b',
    brandSecondaryColor: '#71717a',
    registrationNumber: '',
    taxId: '',
    gstNumber: '',
    orgType: 'promoter' as OrgType,
    country: '',
    state: '',
    city: '',
    postalCode: '',
    founderPhone: '',
  });

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
        const orgData = await getAdminOrganisation();
        setOrg(orgData);
        setForm({
          name: orgData.name,
          description: orgData.description ?? '',
          websiteUrl: orgData.websiteUrl ?? '',
          brandPrimaryColor: orgData.brandPrimaryColor ?? '#18181b',
          brandSecondaryColor: orgData.brandSecondaryColor ?? '#71717a',
          registrationNumber: orgData.registrationNumber ?? '',
          taxId: orgData.taxId ?? '',
          gstNumber: orgData.gstNumber ?? '',
          orgType: (orgData.orgType ?? 'promoter') as OrgType,
          country: orgData.country ?? '',
          state: orgData.state ?? '',
          city: orgData.city ?? '',
          postalCode: orgData.postalCode ?? '',
          founderPhone: orgData.founderPhone ?? '',
        });
      } catch {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateForm(updates: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...updates }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        websiteUrl: form.websiteUrl.trim() || undefined,
        registrationNumber: form.registrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
        state: form.state.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        founderPhone: form.founderPhone.trim() || undefined,
      };
      const updated = await updateAdminOrganisation(payload);
      setOrg(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setAssetUploading(null);
    }
  }

  const legalForm: LegalFormState = {
    name: form.name,
    orgType: form.orgType,
    registrationNumber: form.registrationNumber,
    taxId: form.taxId,
    gstNumber: form.gstNumber,
    country: form.country,
    state: form.state,
    city: form.city,
    postalCode: form.postalCode,
    founderPhone: form.founderPhone,
  };

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            Organisation settings
          </h2>
          {user && <span className="text-xs font-mono text-zinc-500">{user.email}</span>}
        </header>

        <main className="flex-1 p-8 max-w-2xl space-y-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : error && !org ? (
            <div className="text-center text-xs font-mono text-zinc-500">{error}</div>
          ) : org ? (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-mono p-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {saved && (
                <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-mono p-3 rounded flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Settings saved
                </div>
              )}

              <section className="bg-white border border-zinc-200 rounded-lg p-6">
                <OrgProfileEditor
                  orgName={form.name}
                  orgSlug={org.slug}
                  city={form.city || org.city}
                  logoUrl={org.logoUrl}
                  bannerUrl={org.bannerUrl}
                  description={form.description}
                  websiteUrl={form.websiteUrl}
                  brandPrimaryColor={form.brandPrimaryColor}
                  brandSecondaryColor={form.brandSecondaryColor}
                  onDescriptionChange={(v) => updateForm({ description: v })}
                  onWebsiteChange={(v) => updateForm({ websiteUrl: v })}
                  onPrimaryColorChange={(v) => updateForm({ brandPrimaryColor: v })}
                  onSecondaryColorChange={(v) => updateForm({ brandSecondaryColor: v })}
                  onLogoUpload={(file) => handleAssetUpload(file, 'logo')}
                  onBannerUpload={(file) => handleAssetUpload(file, 'banner')}
                  uploading={assetUploading}
                />
              </section>

              <section className="bg-white border border-zinc-200 rounded-lg p-6">
                <OrgLegalEditor
                  form={legalForm}
                  kycStatus={org.verificationStatus}
                  slug={org.slug}
                  onChange={(updates) => updateForm(updates)}
                />
              </section>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="w-full bg-zinc-900 text-white py-2.5 rounded text-xs font-mono font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save all changes'}
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
