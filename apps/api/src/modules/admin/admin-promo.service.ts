import { z } from 'zod';
import {
  createPromoCode,
  deletePromoCode,
  listPromoCodesByOrg,
  updatePromoCode,
} from '../promo/promo.repository.js';

const createPromoSchema = z.object({
  code: z.string().min(2).max(50),
  discountType: z.enum(['percentage', 'fixed_wei']),
  discountValue: z.string().regex(/^\d+$/),
  eventId: z.string().uuid().optional(),
  tierId: z.string().uuid().optional(),
  maxUses: z.number().int().min(1).optional(),
  maxPerUser: z.number().int().min(1).max(20).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const updatePromoSchema = z.object({
  status: z.enum(['active', 'paused', 'exhausted', 'expired']).optional(),
  maxUses: z.number().int().min(1).optional(),
  validUntil: z.string().datetime().optional(),
});

export async function adminListPromoCodes(orgId: string) {
  const promos = await listPromoCodesByOrg(orgId);
  return { promos };
}

export async function adminCreatePromoCode(orgId: string, body: unknown) {
  const parsed = createPromoSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid promo code request', status: 400 as const };
  const promo = await createPromoCode(orgId, parsed.data);
  return { promo, status: 201 as const };
}

export async function adminUpdatePromoCode(orgId: string, promoId: string, body: unknown) {
  const parsed = updatePromoSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid promo code request', status: 400 as const };

  const fields: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) fields.status = parsed.data.status;
  if (parsed.data.maxUses !== undefined) {
    fields.max_uses = parsed.data.maxUses;
    fields.uses_remaining = parsed.data.maxUses;
  }
  if (parsed.data.validUntil !== undefined) fields.valid_until = parsed.data.validUntil;

  const promo = await updatePromoCode(orgId, promoId, fields);
  if (!promo) return { error: 'Promo code not found', status: 404 as const };
  return { promo };
}

export async function adminDeletePromoCode(orgId: string, promoId: string) {
  const deleted = await deletePromoCode(orgId, promoId);
  if (!deleted) return { error: 'Promo code not found', status: 404 as const };
  return { success: true };
}
