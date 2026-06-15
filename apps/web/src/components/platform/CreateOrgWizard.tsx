'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { createPlatformOrganisation, type OrgType, type PlatformTenant } from '@/lib/api';

const ORG_TYPES: { value: OrgType; label: string }[] = [
  { value: 'promoter', label: 'Event Promoter' },
  { value: 'venue', label: 'Venue' },
  { value: 'university', label: 'University' },
  { value: 'sports', label: 'Sports' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'other', label: 'Other' },
];

interface Props {
  onClose: () => void;
  onCreated: (org: PlatformTenant) => void;
}

export default function CreateOrgWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [founderInviteLink, setFounderInviteLink] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('promoter');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [plan, setPlan] = useState<'starter' | 'growth' | 'enterprise'>('starter');
  const [commissionBps, setCommissionBps] = useState(200);
  const [platformNotes, setPlatformNotes] = useState('');

  const [founderName, setFounderName] = useState('');
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPhone, setFounderPhone] = useState('');

  const inputClass =
    'w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-400';
  const labelClass = 'text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400';

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await createPlatformOrganisation({
        name,
        slug: slug || undefined,
        superAdminEmail: founderEmail,
        founderName,
        founderPhone: founderPhone || undefined,
        country,
        state: state || undefined,
        city,
        postalCode: postalCode || undefined,
        orgType,
        registrationNumber: registrationNumber || undefined,
        taxId: taxId || undefined,
        gstNumber: gstNumber || undefined,
        subscriptionPlan: plan,
        platformCommissionBps: commissionBps,
        platformNotes: platformNotes || undefined,
      });
      if (result.founderInvite?.inviteUrl) {
        setFounderInviteLink(`${window.location.origin}${result.founderInvite.inviteUrl}`);
      }
      onCreated(result.org);
      if (!result.founderInvite) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setLoading(false);
    }
  }

  if (founderInviteLink) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-md p-6 space-y-4">
          <h3 className="text-sm font-mono font-bold uppercase">Founder invite created</h3>
          <p className="text-xs text-zinc-600">
            The founder is not registered yet. Share this invite link:
          </p>
          <code className="block text-[10px] bg-zinc-100 p-2 rounded break-all">{founderInviteLink}</code>
          <button type="button" onClick={onClose} className="w-full bg-zinc-900 text-white py-2 rounded text-xs font-mono font-bold">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => !loading && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-zinc-200 rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-mono font-bold uppercase">Create Organisation</h3>
            <p className="text-[10px] text-zinc-400 font-mono">Step {step} of 3</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass}>Legal / display name *</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Slug</label>
              <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="auto-generated" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Organisation type *</label>
              <select className={inputClass} value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)}>
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Registration number</label>
              <input className={inputClass} value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Tax ID / PAN</label>
                <input className={inputClass} value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>GST number</label>
                <input className={inputClass} value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Country</label>
                <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>State</label>
                <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>City</label>
                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Postal code</label>
                <input className={inputClass} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Subscription plan</label>
              <div className="flex space-x-2">
                {(['starter', 'growth', 'enterprise'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      plan === p ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Platform commission (bps)</label>
              <input type="number" min={0} max={10000} className={inputClass} value={commissionBps} onChange={(e) => setCommissionBps(Number(e.target.value))} />
              <p className="text-[9px] text-zinc-400">200 = 2%</p>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Internal notes (platform only)</label>
              <textarea className={inputClass} rows={3} value={platformNotes} onChange={(e) => setPlatformNotes(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass}>Founder full name *</label>
              <input className={inputClass} value={founderName} onChange={(e) => setFounderName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Founder email *</label>
              <input type="email" className={inputClass} value={founderEmail} onChange={(e) => setFounderEmail(e.target.value)} required />
              <p className="text-[9px] text-zinc-400">If not registered, an invite link will be generated.</p>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Founder phone</label>
              <input className={inputClass} value={founderPhone} onChange={(e) => setFounderPhone(e.target.value)} />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-2 rounded">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            disabled={step === 1 || loading}
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center space-x-1 text-xs font-mono text-zinc-600 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !name}
              className="flex items-center space-x-1 bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !founderName || !founderEmail}
              className="flex items-center space-x-1 bg-zinc-900 text-white px-4 py-2 rounded text-xs font-mono font-bold disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create organisation</span>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
