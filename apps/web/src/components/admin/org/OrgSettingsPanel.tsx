'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import {
  getMe,
  getAdminOrganisation,
  updateAdminOrganisation,
  uploadOrgAsset,
  inferFileMimeType,
  type AdminOrgDetails,
  type OrgType,
} from '@/lib/api';
import OrgProfileEditor from '@/components/admin/OrgProfileEditor';
import OrgLegalEditor, { type LegalFormState } from '@/components/admin/OrgLegalEditor';

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function OrgSettingsPanel() {
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
          return;
        }
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
      const updated = await updateAdminOrganisation({
        ...form,
        websiteUrl: form.websiteUrl.trim() || undefined,
        registrationNumber: form.registrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
        state: form.state.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        founderPhone: form.founderPhone.trim() || undefined,
      });
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
      const { org: updated } = await uploadOrgAsset({
        fileName: file.name,
        mimeType: inferFileMimeType(file),
        contentBase64: await fileToBase64(file),
        assetType,
      });
      setOrg(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAssetUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-silver" />
      </div>
    );
  }

  if (error && !org) {
    return <p className="text-xs font-mono text-silver">{error}</p>;
  }

  if (!org) return null;

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
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          Settings saved
        </div>
      )}

      <section className="bg-paper border border-mist rounded-xl p-5">
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

      <section className="bg-paper border border-mist rounded-xl p-5">
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
        className="w-full bg-ink text-paper py-2.5 rounded-lg text-xs font-mono font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save all changes'}
      </button>
    </div>
  );
}
