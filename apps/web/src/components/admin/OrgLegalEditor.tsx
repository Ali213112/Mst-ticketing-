'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { OrgType } from '@/lib/api';

const ORG_TYPES: { value: OrgType; label: string }[] = [
  { value: 'promoter', label: 'Event Promoter' },
  { value: 'venue', label: 'Venue' },
  { value: 'university', label: 'University' },
  { value: 'sports', label: 'Sports' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'other', label: 'Other' },
];

export interface LegalFormState {
  name: string;
  orgType: OrgType;
  registrationNumber: string;
  taxId: string;
  gstNumber: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  founderPhone: string;
}

interface OrgLegalEditorProps {
  form: LegalFormState;
  kycStatus?: string;
  slug?: string;
  onChange: (updates: Partial<LegalFormState>) => void;
}

type LegalSection = 'identity' | 'tax' | 'location' | 'contact' | null;

export default function OrgLegalEditor({ form, kycStatus, slug, onChange }: OrgLegalEditorProps) {
  const [editing, setEditing] = useState<LegalSection>(null);
  const [draft, setDraft] = useState(form);

  useEffect(() => {
    setDraft(form);
  }, [form]);

  const inputClass =
    'w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400';

  function apply(section: Exclude<LegalSection, null>) {
    const keys: Record<Exclude<LegalSection, null>, (keyof LegalFormState)[]> = {
      identity: ['name', 'orgType', 'registrationNumber'],
      tax: ['taxId', 'gstNumber'],
      location: ['country', 'state', 'city', 'postalCode'],
      contact: ['founderPhone'],
    };
    const patch = Object.fromEntries(keys[section].map((key) => [key, draft[key]])) as Partial<LegalFormState>;
    onChange(patch);
    setEditing(null);
  }

  function cancel(section: LegalSection) {
    setDraft(form);
    setEditing(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-mono font-bold uppercase text-zinc-400">Legal & location</h3>
        {slug && (
          <span className="text-[10px] font-mono text-zinc-400">
            KYC: {kycStatus ?? 'pending'} · {slug}
          </span>
        )}
      </div>

      <LegalRow
        label="Organisation identity"
        editing={editing === 'identity'}
        onEdit={() => setEditing('identity')}
        onSave={() => apply('identity')}
        onCancel={() => cancel('identity')}
        display={
          <dl className="grid grid-cols-1 gap-1 text-xs font-mono text-zinc-700">
            <div><dt className="text-zinc-400 inline">Name: </dt><dd className="inline">{form.name || '—'}</dd></div>
            <div><dt className="text-zinc-400 inline">Type: </dt><dd className="inline">{ORG_TYPES.find((t) => t.value === form.orgType)?.label ?? form.orgType}</dd></div>
            <div><dt className="text-zinc-400 inline">Registration: </dt><dd className="inline">{form.registrationNumber || '—'}</dd></div>
          </dl>
        }
      >
        <div className="space-y-2">
          <input className={inputClass} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Display name" />
          <select className={inputClass} value={draft.orgType} onChange={(e) => setDraft((d) => ({ ...d, orgType: e.target.value as OrgType }))}>
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input className={inputClass} value={draft.registrationNumber} onChange={(e) => setDraft((d) => ({ ...d, registrationNumber: e.target.value }))} placeholder="Registration number" />
        </div>
      </LegalRow>

      <LegalRow
        label="Tax identifiers"
        editing={editing === 'tax'}
        onEdit={() => setEditing('tax')}
        onSave={() => apply('tax')}
        onCancel={() => cancel('tax')}
        display={
          <dl className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-700">
            <div><dt className="text-zinc-400 text-[10px] uppercase">Tax ID</dt><dd>{form.taxId || '—'}</dd></div>
            <div><dt className="text-zinc-400 text-[10px] uppercase">GST</dt><dd>{form.gstNumber || '—'}</dd></div>
          </dl>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={draft.taxId} onChange={(e) => setDraft((d) => ({ ...d, taxId: e.target.value }))} placeholder="Tax ID / PAN" />
          <input className={inputClass} value={draft.gstNumber} onChange={(e) => setDraft((d) => ({ ...d, gstNumber: e.target.value }))} placeholder="GST number" />
        </div>
      </LegalRow>

      <LegalRow
        label="Location"
        editing={editing === 'location'}
        onEdit={() => setEditing('location')}
        onSave={() => apply('location')}
        onCancel={() => cancel('location')}
        display={
          <p className="text-xs font-mono text-zinc-700">
            {[form.city, form.state, form.postalCode, form.country].filter(Boolean).join(', ') || '—'}
          </p>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={draft.country} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))} placeholder="Country" />
          <input className={inputClass} value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} placeholder="State" />
          <input className={inputClass} value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="City" />
          <input className={inputClass} value={draft.postalCode} onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))} placeholder="Postal code" />
        </div>
      </LegalRow>

      <LegalRow
        label="Contact phone"
        editing={editing === 'contact'}
        onEdit={() => setEditing('contact')}
        onSave={() => apply('contact')}
        onCancel={() => cancel('contact')}
        display={<p className="text-xs font-mono text-zinc-700">{form.founderPhone || '—'}</p>}
      >
        <input className={inputClass} value={draft.founderPhone} onChange={(e) => setDraft((d) => ({ ...d, founderPhone: e.target.value }))} placeholder="+919876543210" />
      </LegalRow>
    </div>
  );
}

function LegalRow({
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
          <button type="button" onClick={onEdit} className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded" title={`Edit ${label}`}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2">
        {editing ? (
          <div className="space-y-2">
            {children}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-zinc-500">
                <X className="w-3 h-3" /> Cancel
              </button>
              <button type="button" onClick={onSave} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold bg-zinc-900 text-white rounded">
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
