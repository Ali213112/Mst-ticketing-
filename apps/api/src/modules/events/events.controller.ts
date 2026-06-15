import type { Request, Response } from 'express';
import { browseEventDetail, browseEvents, browseFeaturedEvents } from '../admin/admin-event.service.js';

export async function listFeaturedEventsHandler(_req: Request, res: Response): Promise<void> {
  const result = await browseFeaturedEvents();
  res.json({ success: true, data: result.rows });
}

export async function listEventsHandler(req: Request, res: Response): Promise<void> {
  const result = await browseEvents(req.query as Record<string, string | undefined>);
  res.json({ success: true, data: result.rows, meta: result.meta });
}

export async function getEventHandler(req: Request, res: Response): Promise<void> {
  const result = await browseEventDetail(req.params.eventId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: { ...result.event, tiers: result.tiers } });
}

export async function listTiersHandler(req: Request, res: Response): Promise<void> {
  const result = await browseEventDetail(req.params.eventId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.tiers });
}
