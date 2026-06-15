'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Globe, ImagePlus, Loader2, Pencil, X, Check } from 'lucide-react';
import { toDisplayImageUrl } from '@/lib/media';

interface OrgProfileEditorProps {
  orgName: string;
  orgSlug?: string;
  city?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description: string;
  websiteUrl: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  onDescriptionChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onPrimaryColorChange: (value: string) => void;
  onSecondaryColorChange: (value: string) => void;
  onLogoUpload: (file: File) => Promise<void>;
  onBannerUpload: (file: File) => Promise<void>;
  uploading?: 'logo' | 'banner' | null;
}

type EditField = 'description' | 'website' | 'colors' | null;

export default function OrgProfileEditor({
  orgName,
  orgSlug,
  city,
  logoUrl,
  bannerUrl,
  description,
  websiteUrl,
  brandPrimaryColor,
  brandSecondaryColor,
  onDescriptionChange,
  onWebsiteChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onLogoUpload,
  onBannerUpload,
  uploading,
}: OrgProfileEditorProps) {
  const [editing, setEditing] = useState<EditField>(null);
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftWebsite, setDraftWebsite] = useState(websiteUrl);
  const [draftPrimary, setDraftPrimary] = useState(brandPrimaryColor);
  const [draftSecondary, setDraftSecondary] = useState(brandSecondaryColor);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftDescription(description);
  }, [description]);

  useEffect(() => {
    setDraftWebsite(websiteUrl);
  }, [websiteUrl]);

  useEffect(() => {
    setDraftPrimary(brandPrimaryColor);
    setDraftSecondary(brandSecondaryColor);
  }, [brandPrimaryColor, brandSecondaryColor]);

  const prevLogoUrl = useRef(logoUrl);
  const prevBannerUrl = useRef(bannerUrl);

  // Only drop local blob preview after the server URL updates post-upload (not on every localLogo set).
  useEffect(() => {
    if (logoUrl && logoUrl !== prevLogoUrl.current && localLogo) {
      URL.revokeObjectURL(localLogo);
      setLocalLogo(null);
    }
    prevLogoUrl.current = logoUrl;
  }, [logoUrl, localLogo]);

  useEffect(() => {
    if (bannerUrl && bannerUrl !== prevBannerUrl.current && localBanner) {
      URL.revokeObjectURL(localBanner);
      setLocalBanner(null);
    }
    prevBannerUrl.current = bannerUrl;
  }, [bannerUrl, localBanner]);

  useEffect(() => {
    return () => {
      if (localLogo) URL.revokeObjectURL(localLogo);
      if (localBanner) URL.revokeObjectURL(localBanner);
    };
  }, [localLogo, localBanner]);

  const displayLogo = localLogo ?? toDisplayImageUrl(logoUrl);
  const displayBanner = localBanner ?? toDisplayImageUrl(bannerUrl);

  async function pickAsset(file: File, type: 'logo' | 'banner') {
    const preview = URL.createObjectURL(file);
    if (type === 'logo') setLocalLogo(preview);
    else setLocalBanner(preview);

    try {
      if (type === 'logo') await onLogoUpload(file);
      else await onBannerUpload(file);
    } catch {
      if (type === 'logo') {
        URL.revokeObjectURL(preview);
        setLocalLogo(null);
      } else {
        URL.revokeObjectURL(preview);
        setLocalBanner(null);
      }
    }
  }

  function saveField(field: EditField) {
    if (field === 'description') onDescriptionChange(draftDescription);
    if (field === 'website') onWebsiteChange(draftWebsite);
    if (field === 'colors') {
      onPrimaryColorChange(draftPrimary);
      onSecondaryColorChange(draftSecondary);
    }
    setEditing(null);
  }

  function cancelEdit(field: EditField) {
    if (field === 'description') setDraftDescription(description);
    if (field === 'website') setDraftWebsite(websiteUrl);
    if (field === 'colors') {
      setDraftPrimary(brandPrimaryColor);
      setDraftSecondary(brandSecondaryColor);
    }
    setEditing(null);
  }

  const inputClass =
    'w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400';

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
        Live profile preview — how fans will see your organisation
      </p>

      {/* Profile preview card */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="relative h-36 sm:h-44 group">
          {displayBanner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayBanner}
              alt={`${orgName} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-zinc-400"
              style={{ background: `linear-gradient(135deg, ${brandPrimaryColor}22, ${brandSecondaryColor}44)` }}
            >
              <span className="text-[10px] font-mono uppercase">No banner yet</span>
            </div>
          )}
          {uploading === 'banner' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white border border-zinc-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Change banner"
          >
            <ImagePlus className="w-4 h-4 text-zinc-700" />
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickAsset(f, 'banner');
              e.target.value = '';
            }}
          />
        </div>

        <div className="px-5 pb-5 -mt-10 relative">
          <div className="flex items-end gap-4">
            <div className="relative group shrink-0">
              <div
                className="w-20 h-20 rounded-lg border-4 border-white shadow-md overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                {displayLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayLogo} alt={`${orgName} logo`} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-white/80" />
                )}
                {uploading === 'logo' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-zinc-900 text-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change logo"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickAsset(f, 'logo');
                  e.target.value = '';
                }}
              />
            </div>

            <div className="pb-1 min-w-0 flex-1">
              <h4 className="text-lg font-bold font-mono uppercase text-zinc-950 truncate">{orgName}</h4>
              <p className="text-[10px] font-mono text-zinc-400 uppercase">
                {orgSlug ? `ticketchain.com/orgs/${orgSlug}` : 'Organisation profile'}
                {city ? ` · ${city}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600 leading-relaxed">
              {description.trim() || (
                <span className="text-zinc-400 italic">Add a description so attendees know who you are.</span>
              )}
            </p>

            {websiteUrl && (
              <a
                href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-zinc-700 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">Brand</span>
              <span className="w-5 h-5 rounded border border-zinc-200" style={{ backgroundColor: brandPrimaryColor }} title="Primary" />
              <span className="w-5 h-5 rounded border border-zinc-200" style={{ backgroundColor: brandSecondaryColor }} title="Secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-2">
        <EditableRow
          label="Description"
          editing={editing === 'description'}
          onEdit={() => setEditing('description')}
          onSave={() => saveField('description')}
          onCancel={() => cancelEdit('description')}
          display={
            <p className="text-xs text-zinc-700">
              {description.trim() || <span className="text-zinc-400">Not set</span>}
            </p>
          }
        >
          <textarea
            className={inputClass}
            rows={3}
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="Tell attendees about your organisation..."
          />
        </EditableRow>

        <EditableRow
          label="Website"
          editing={editing === 'website'}
          onEdit={() => setEditing('website')}
          onSave={() => saveField('website')}
          onCancel={() => cancelEdit('website')}
          display={
            <p className="text-xs font-mono text-zinc-700">
              {websiteUrl.trim() || <span className="text-zinc-400">Not set</span>}
            </p>
          }
        >
          <input
            className={inputClass}
            value={draftWebsite}
            onChange={(e) => setDraftWebsite(e.target.value)}
            placeholder="https://yourorg.com"
          />
        </EditableRow>

        <EditableRow
          label="Brand colors"
          editing={editing === 'colors'}
          onEdit={() => setEditing('colors')}
          onSave={() => saveField('colors')}
          onCancel={() => cancelEdit('colors')}
          display={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-600">
                <span className="w-4 h-4 rounded border" style={{ backgroundColor: brandPrimaryColor }} />
                Primary
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-600">
                <span className="w-4 h-4 rounded border" style={{ backgroundColor: brandSecondaryColor }} />
                Secondary
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">Primary</span>
              <input type="color" className="w-full h-9 cursor-pointer" value={draftPrimary} onChange={(e) => setDraftPrimary(e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-zinc-400 uppercase">Secondary</span>
              <input type="color" className="w-full h-9 cursor-pointer" value={draftSecondary} onChange={(e) => setDraftSecondary(e.target.value)} />
            </div>
          </div>
        </EditableRow>
      </div>
    </div>
  );
}

function EditableRow({
  label,
  editing,
  onEdit,
  onSave,
  onCancel,
  display,
  children,
}: {
  label: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  display: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-100 rounded-lg p-3 bg-zinc-50/50">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{label}</span>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
            title={`Edit ${label.toLowerCase()}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2">
        {editing ? (
          <div className="space-y-2">
            {children}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold bg-zinc-900 text-white rounded"
              >
                <Check className="w-3 h-3" /> Apply
              </button>
            </div>
          </div>
        ) : (
          display
        )}
      </div>
    </div>
  );
}
