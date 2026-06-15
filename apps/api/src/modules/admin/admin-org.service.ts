import { z } from 'zod';
import { randomBytes } from 'crypto';
import { ROLES } from '@ticketchain/shared';
import { pool } from '../../shared/db/postgres.service.js';
import { pinFileToIpfs } from '../../shared/ipfs/pinata.service.js';
import {
  createInvite,
  expireStaleInvites,
  findOrganisationById,
  findOrgMember,
  listOrgMembers,
  listPendingInvites,
  removeOrgMember,
  submitOrganisationKyc,
  updateOrganisation,
  updateOrgMember,
} from '../org/org.repository.js';

const updateOrgSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  brandSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  taxId: z.string().max(50).optional(),
  gstNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(100).optional(),
  orgType: z.enum(['promoter', 'venue', 'university', 'sports', 'corporate', 'other']).optional(),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  founderPhone: z.string().max(20).optional(),
});

function inferMimeType(fileName: string, mimeType: string): string {
  if (mimeType) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext] ?? 'application/octet-stream';
}

function isAllowedUploadMime(assetType: string, fileName: string, mimeType: string): boolean {
  const mime = inferMimeType(fileName, mimeType);
  if (assetType === 'kyc_document') {
    return mime.startsWith('image/') || mime === 'application/pdf';
  }
  return mime.startsWith('image/');
}

const uploadImageSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().optional().default(''),
    contentBase64: z.string().min(1),
    assetType: z.enum(['logo', 'banner', 'kyc_document']),
  })
  .refine((data) => isAllowedUploadMime(data.assetType, data.fileName, data.mimeType ?? ''), {
    message: 'Invalid mime type for asset',
  });

const kycSubmitSchema = z.object({
  documents: z.array(
    z.object({
      type: z.enum(['registration_certificate', 'tax_id', 'id_proof', 'address_proof', 'other']),
      label: z.string().min(1).max(255),
      url: z.string().min(1).refine(
        (u) => u.startsWith('https://') || u.startsWith('http://') || u.startsWith('ipfs://'),
        'Invalid document URL'
      ),
    })
  ).min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.union([z.literal(ROLES.ADMIN), z.literal(ROLES.VOLUNTEER)]),
  eventId: z.string().uuid().optional(),
  name: z.string().max(255).optional(),
});

const updateMemberSchema = z.object({
  role: z.union([z.literal(ROLES.VOLUNTEER), z.literal(ROLES.ADMIN)]).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getOrgStats(orgId: string) {
  const result = await pool.query<{ members: string; pending_invites: string }>(
    `SELECT
       (SELECT COUNT(*)::text FROM org_members WHERE org_id = $1 AND deleted_at IS NULL AND status = 'active') AS members,
       (SELECT COUNT(*)::text FROM invites WHERE org_id = $1 AND status = 'pending') AS pending_invites`,
    [orgId]
  );
  const row = result.rows[0];
  return {
    activeMembers: Number(row?.members ?? 0),
    pendingInvites: Number(row?.pending_invites ?? 0),
  };
}

export async function adminGetOrganisation(orgId: string) {
  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  const stats = await getOrgStats(orgId);
  return { org, stats };
}

export async function adminUpdateOrganisation(orgId: string, body: unknown) {
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid request', status: 400 as const };

  const fields: Record<string, unknown> = {};
  const map: Record<string, string> = {
    name: 'name',
    description: 'description',
    logoUrl: 'logo_url',
    bannerUrl: 'banner_url',
    websiteUrl: 'website_url',
    brandPrimaryColor: 'brand_primary_color',
    brandSecondaryColor: 'brand_secondary_color',
    taxId: 'tax_id',
    gstNumber: 'gst_number',
    registrationNumber: 'registration_number',
    orgType: 'org_type',
    country: 'country',
    state: 'state',
    city: 'city',
    postalCode: 'postal_code',
    founderPhone: 'founder_phone',
  };
  for (const [key, col] of Object.entries(map)) {
    const val = parsed.data[key as keyof typeof parsed.data];
    if (val !== undefined) fields[col] = val;
  }

  const org = await updateOrganisation(orgId, fields);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  return { org };
}

export async function adminSubmitKyc(orgId: string, body: unknown) {
  const parsed = kycSubmitSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid KYC payload', status: 400 as const };

  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  if (org.verificationStatus === 'verified') {
    return { error: 'Organisation is already verified', status: 409 as const };
  }

  const updated = await submitOrganisationKyc(orgId, parsed.data.documents);
  if (!updated) return { error: 'Organisation not found', status: 404 as const };
  return { org: updated };
}

export async function adminListMembers(orgId: string) {
  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  const members = await listOrgMembers(orgId);
  return { members };
}

export async function adminInviteMember(
  orgId: string,
  invitedById: string,
  body: unknown
) {
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid invite request', status: 400 as const };

  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };

  await expireStaleInvites();

  const email = parsed.data.email.toLowerCase();
  const existingMember = (await listOrgMembers(orgId)).find(
    (m) => m.email.toLowerCase() === email && m.status === 'active'
  );
  if (existingMember) {
    return { error: 'User is already a member of this organisation', status: 409 as const };
  }

  const pendingDuplicate = await pool.query(
    `SELECT id FROM invites WHERE org_id = $1 AND invitee_email = $2 AND status = 'pending' AND token_expires_at > NOW()`,
    [orgId, email]
  );
  if ((pendingDuplicate.rowCount ?? 0) > 0) {
    return { error: 'A pending invite already exists for this email', status: 409 as const };
  }

  const inviteToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invite = await createInvite({
    orgId,
    invitedById,
    inviteeEmail: email,
    inviteeName: parsed.data.name,
    roleToAssign: parsed.data.role,
    eventId: parsed.data.eventId,
    inviteToken,
    expiresAt,
  });

  return {
    invite,
    inviteToken,
    status: 201 as const,
  };
}

export async function adminUpdateMember(orgId: string, memberId: string, body: unknown) {
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid request', status: 400 as const };

  const member = await findOrgMember(orgId, memberId);
  if (!member) return { error: 'Member not found', status: 404 as const };
  if (member.role === ROLES.SUPER_ADMIN) {
    return { error: 'Cannot modify the organisation super admin', status: 403 as const };
  }

  const updated = await updateOrgMember(orgId, memberId, {
    role: parsed.data.role,
    status: parsed.data.status,
  });
  if (!updated) return { error: 'Member not found', status: 404 as const };
  return { member: updated };
}

export async function adminRemoveMember(orgId: string, memberId: string, requesterId: string) {
  const member = await findOrgMember(orgId, memberId);
  if (!member) return { error: 'Member not found', status: 404 as const };
  if (member.role === ROLES.SUPER_ADMIN) {
    return { error: 'Cannot remove the organisation super admin', status: 403 as const };
  }
  if (member.userId === requesterId) {
    return { error: 'Cannot remove yourself', status: 403 as const };
  }

  const removed = await removeOrgMember(orgId, memberId);
  if (!removed) return { error: 'Member not found', status: 404 as const };
  return { success: true };
}

export async function adminUploadOrgAsset(orgId: string, body: unknown) {
  const parsed = uploadImageSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid upload payload', status: 400 as const };

  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };

  const mimeType = inferMimeType(parsed.data.fileName, parsed.data.mimeType ?? '');
  const buffer = Buffer.from(parsed.data.contentBase64, 'base64');
  const pin = await pinFileToIpfs(parsed.data.fileName, buffer, mimeType);

  if (parsed.data.assetType === 'kyc_document') {
    return { url: pin.gatewayUrl, ipfsUri: pin.uri, asset: pin, status: 201 as const };
  }

  const field = parsed.data.assetType === 'logo' ? 'logo_url' : 'banner_url';
  const updated = await updateOrganisation(orgId, { [field]: pin.gatewayUrl });
  if (!updated) return { error: 'Failed to update organisation', status: 500 as const };

  return { org: updated, asset: pin, status: 201 as const };
}

export async function adminListInvites(orgId: string) {
  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  await expireStaleInvites();
  const invites = await listPendingInvites(orgId);
  return { invites };
}

export {
  updateOrgSchema,
  kycSubmitSchema,
  inviteSchema,
  updateMemberSchema,
  uploadImageSchema,
};
