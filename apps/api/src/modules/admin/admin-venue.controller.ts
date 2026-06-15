import type { Request, Response } from 'express';
import {
  adminCreateVenue,
  adminDeleteVenue,
  adminListVenues,
  adminUpdateVenue,
} from './admin-venue.service.js';

export async function listVenuesHandler(req: Request, res: Response): Promise<void> {
  const result = await adminListVenues(req.orgId!);
  res.json({ success: true, data: result.venues });
}

export async function createVenueHandler(req: Request, res: Response): Promise<void> {
  const result = await adminCreateVenue(req.orgId!, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.status(result.status).json({ success: true, data: result.venue });
}

export async function updateVenueHandler(req: Request, res: Response): Promise<void> {
  const result = await adminUpdateVenue(req.orgId!, req.params.venueId as string, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.venue });
}

export async function deleteVenueHandler(req: Request, res: Response): Promise<void> {
  const result = await adminDeleteVenue(req.orgId!, req.params.venueId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true });
}
