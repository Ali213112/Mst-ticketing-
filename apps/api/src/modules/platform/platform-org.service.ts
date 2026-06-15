import { randomBytes } from 'crypto';
import { z } from 'zod';
import { ROLES } from '@ticketchain/shared';
import { pool } from '../../shared/db/postgres.service.js';
import { parsePagination } from '../../shared/utils/pagination.js';
import { slugify } from '../../shared/utils/slug.js';
import {
  createInvite,
  createOrganisation,
  findOrganisationById,
  findOrganisationBySlug,
  findUserByEmail,
  listOrganisations,
  softDeleteOrganisation,
  updateOrganisation,
  updateOrganisationStatus,
  userHasOrgAsSuperAdmin,
  verifyOrganisationKyc,
} from '../org/org.repository.js';

const orgTypeSchema = z.enum(['promoter', 'venue', 'university', 'sports', 'corporate', 'other']);

const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).optional(),
  superAdminEmail: z.string().email(),
  founderName: z.string().min(1).max(255),
  founderPhone: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  orgType: orgTypeSchema,
  registrationNumber: z.string().max(100).optional(),
  taxId: z.string().max(50).optional(),
  gstNumber: z.string().max(50).optional(),
  subscriptionPlan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  platformCommissionBps: z.number().int().min(0).max(10000).optional(),
  platformNotes: z.string().max(5000).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  orgType: orgTypeSchema.optional(),
  registrationNumber: z.string().max(100).optional(),
  taxId: z.string().max(50).optional(),
  gstNumber: z.string().max(50).optional(),
  subscriptionPlan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  platformCommissionBps: z.number().int().min(0).max(10000).optional(),
  platformNotes: z.string().max(5000).optional(),
});

const statusSchema = z.object({
  status: z.enum(['pending_verification', 'active', 'suspended', 'inactive']),
});

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
});

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function platformListOrganisations(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const { rows, total } = await listOrganisations({
    offset,
    limit,
    status: query.status,
  });
  return { rows, meta: { page, limit, total } };
}

export async function platformCreateOrganisation(
  body: unknown,
  platformAdminId: string
): Promise<
  | { org: Awaited<ReturnType<typeof createOrganisation>>; founderInvite?: { inviteToken: string; inviteUrl: string }; status: 201 }
  | { error: string; status: number }
> {
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Invalid request', status: 400 };
  }

  const data = parsed.data;
  const founderEmail = data.superAdminEmail.toLowerCase();
  const founder = await findUserByEmail(founderEmail);

  if (founder && (await userHasOrgAsSuperAdmin(founder.id))) {
    return { error: 'User is already a super admin of another organisation', status: 409 };
  }

  const slug = data.slug ?? slugify(data.name);
  if (!slug) {
    return { error: 'Could not generate a valid slug', status: 400 };
  }

  if (await findOrganisationBySlug(slug)) {
    return { error: 'Organisation slug already exists', status: 409 };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const org = await createOrganisation(client, {
      name: data.name,
      slug,
      description: data.description,
      superAdminId: founder?.id ?? null,
      superAdminWalletAddress: founder?.wallet_address ?? null,
      country: data.country,
      state: data.state,
      city: data.city,
      postalCode: data.postalCode,
      orgType: data.orgType,
      taxId: data.taxId,
      gstNumber: data.gstNumber,
      registrationNumber: data.registrationNumber,
      founderName: data.founderName,
      founderPhone: data.founderPhone,
      pendingFounderEmail: founder ? undefined : founderEmail,
      platformNotes: data.platformNotes,
      platformCommissionBps: data.platformCommissionBps,
      subscriptionPlan: data.subscriptionPlan,
    });

    let founderInvite: { inviteToken: string; inviteUrl: string } | undefined;

    if (!founder) {
      const inviteToken = randomBytes(32).toString('hex');
      const invite = await createInvite({
        orgId: org.id,
        invitedById: platformAdminId,
        inviteeEmail: founderEmail,
        inviteeName: data.founderName,
        roleToAssign: ROLES.SUPER_ADMIN,
        inviteToken,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        includeToken: true,
      });
      founderInvite = {
        inviteToken: invite.inviteToken ?? inviteToken,
        inviteUrl: `/login?invite=${invite.inviteToken ?? inviteToken}`,
      };
    }

    await client.query('COMMIT');
    return { org, founderInvite, status: 201 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function platformGetOrganisation(orgId: string) {
  const org = await findOrganisationById(orgId);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  return { org };
}

export async function platformUpdateOrganisation(orgId: string, body: unknown) {
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid request', status: 400 as const };

  const fields: Record<string, unknown> = {};
  const map: Record<string, string> = {
    name: 'name',
    description: 'description',
    logoUrl: 'logo_url',
    websiteUrl: 'website_url',
    country: 'country',
    state: 'state',
    city: 'city',
    postalCode: 'postal_code',
    orgType: 'org_type',
    registrationNumber: 'registration_number',
    taxId: 'tax_id',
    gstNumber: 'gst_number',
    subscriptionPlan: 'subscription_plan',
    platformCommissionBps: 'platform_commission_bps',
    platformNotes: 'platform_notes',
  };

  for (const [key, col] of Object.entries(map)) {
    const val = parsed.data[key as keyof typeof parsed.data];
    if (val !== undefined) fields[col] = val;
  }

  const org = await updateOrganisation(orgId, fields);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  return { org };
}

export async function platformDeleteOrganisation(orgId: string) {
  const deleted = await softDeleteOrganisation(orgId);
  if (!deleted) return { error: 'Organisation not found', status: 404 as const };
  return { success: true };
}

export async function platformUpdateOrganisationStatus(orgId: string, body: unknown) {
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid status', status: 400 as const };

  const org = await updateOrganisationStatus(orgId, parsed.data.status);
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  return { org };
}

export async function platformVerifyOrganisation(orgId: string, body: unknown, adminId: string) {
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid request', status: 400 as const };

  const org = await verifyOrganisationKyc(orgId, {
    action: parsed.data.action,
    verifiedById: adminId,
  });
  if (!org) return { error: 'Organisation not found', status: 404 as const };
  return { org };
}

export {
  createOrgSchema,
  updateOrgSchema,
  statusSchema,
  verifySchema,
};
