import type { Request, Response } from 'express';
import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminListPromoCodes,
  adminUpdatePromoCode,
} from './admin-promo.service.js';

export async function listPromoCodesHandler(req: Request, res: Response): Promise<void> {
  const result = await adminListPromoCodes(req.orgId!);
  res.json({ success: true, data: result.promos });
}

export async function createPromoCodeHandler(req: Request, res: Response): Promise<void> {
  const result = await adminCreatePromoCode(req.orgId!, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.status(result.status).json({ success: true, data: result.promo });
}

export async function updatePromoCodeHandler(req: Request, res: Response): Promise<void> {
  const result = await adminUpdatePromoCode(req.orgId!, req.params.promoId as string, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.promo });
}

export async function deletePromoCodeHandler(req: Request, res: Response): Promise<void> {
  const result = await adminDeletePromoCode(req.orgId!, req.params.promoId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true });
}
