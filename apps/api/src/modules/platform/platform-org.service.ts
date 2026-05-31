import { z } from 'zod';
import { pool } from '../../shared/db/postgres.service.js';
import { parsePagination } from '../../shared/utils/pagination.js';
import { slugify } from '../../shared/utils/slug.js';
import {
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

const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).optional(),
  superAdminEmail: z.string().email(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  subscriptionPlan: z.enum(['starter', 'growth', 'enterprise']).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  subscriptionPlan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  platformCommissionBps: z.number().int().min(0).max(10000).optional(),
});

const statusSchema = z.object({
  status: z.enum(['pending_verification', 'active', 'suspended', 'inactive']),
});

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export async function platformListOrganisations(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const { rows, total } = await listOrganisations({
    offset,
    limit,
    status: query.status,
  });
  return { rows, meta: { page, limit, total } };
}

export async function platformCreateOrganisation(body: unknown) {
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Invalid request', status: 400 as const };
  }

  const data = parsed.data;
  const founder = await findUserByEmail(data.superAdminEmail);
  if (!founder) {
    return {
      error: 'Founder user not found — they must register via Web3Auth first',
      status: 400 as const,
    };
  }

  if (await userHasOrgAsSuperAdmin(founder.id)) {
    return { error: 'User is already a super admin of another organisation', status: 409 as const };
  }

  const slug = data.slug ?? slugify(data.name);
  if (!slug) {
    return { error: 'Could not generate a valid slug', status: 400 as const };
  }

  if (await findOrganisationBySlug(slug)) {
    return { error: 'Organisation slug already exists', status: 409 as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const org = await createOrganisation(client, {
      name: data.name,
      slug,
      description: data.description,
      superAdminId: founder.id,
      superAdminWalletAddress: founder.wallet_address,
      country: data.country,
      city: data.city,
      subscriptionPlan: data.subscriptionPlan,
    });
    await client.query('COMMIT');
    return { org, status: 201 as const };
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
  if (parsed.data.name !== undefined) fields.name = parsed.data.name;
  if (parsed.data.description !== undefined) fields.description = parsed.data.description;
  if (parsed.data.logoUrl !== undefined) fields.logo_url = parsed.data.logoUrl;
  if (parsed.data.websiteUrl !== undefined) fields.website_url = parsed.data.websiteUrl;
  if (parsed.data.country !== undefined) fields.country = parsed.data.country;
  if (parsed.data.city !== undefined) fields.city = parsed.data.city;
  if (parsed.data.subscriptionPlan !== undefined) fields.subscription_plan = parsed.data.subscriptionPlan;
  if (parsed.data.platformCommissionBps !== undefined) {
    fields.platform_commission_bps = parsed.data.platformCommissionBps;
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
