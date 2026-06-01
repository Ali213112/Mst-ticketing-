import type { Request, Response } from 'express';
import { createGzip } from 'zlib';
import {
  verifyAndCheckin,
  getVolunteerEvents,
  getVolunteerEventDetail,
  getCheckinStatsForVolunteer,
  getCheckinHistoryForVolunteer,
  generateOfflineSnapshot,
} from './volunteer.service.js';

/* ------------------------------------------------------------------ */
/*  POST /api/volunteer/checkin/verify                                */
/* ------------------------------------------------------------------ */

export async function verifyCheckinHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await verifyAndCheckin({
    volunteerId: req.user.userId,
    body: req.body,
  });

  if ('error' in result) {
    res.status(result.status).json({
      success: false,
      error: result.error,
      code: result.code,
    });
    return;
  }

  const statusCode = result.result.success ? 200 : 200;
  res.status(statusCode).json({ success: true, data: result.result });
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteer/events                                         */
/* ------------------------------------------------------------------ */

export async function listVolunteerEventsHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getVolunteerEvents(req.user.userId);
  res.json({ success: true, data: result.assignments });
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteer/events/:eventId                                */
/* ------------------------------------------------------------------ */

export async function getVolunteerEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getVolunteerEventDetail(
    req.user.userId,
    req.params.eventId as string
  );

  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, data: result });
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteer/checkin/stats?eventId=                         */
/* ------------------------------------------------------------------ */

export async function getCheckinStatsHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const eventId = req.query.eventId as string | undefined;
  if (!eventId) {
    res.status(400).json({
      success: false,
      error: 'eventId query parameter is required',
      code: 'MISSING_EVENT_ID',
    });
    return;
  }

  const result = await getCheckinStatsForVolunteer(req.user.userId, eventId);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, data: result.stats });
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteer/checkin/history?eventId=&page=&limit=          */
/* ------------------------------------------------------------------ */

export async function getCheckinHistoryHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getCheckinHistoryForVolunteer(
    req.user.userId,
    req.query as Record<string, string | undefined>
  );

  res.json({ success: true, data: result.rows, meta: result.meta });
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteer/checkin/offline-snapshot?eventId=               */
/* ------------------------------------------------------------------ */

export async function getOfflineSnapshotHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const eventId = req.query.eventId as string | undefined;
  if (!eventId) {
    res.status(400).json({
      success: false,
      error: 'eventId query parameter is required',
      code: 'MISSING_EVENT_ID',
    });
    return;
  }

  const result = await generateOfflineSnapshot(req.user.userId, eventId);

  if ('error' in result) {
    res.status(result.status ?? 500).json({ success: false, error: result.error });
    return;
  }

  const jsonBody = JSON.stringify(result.snapshot);

  // Check if client accepts gzip
  const acceptEncoding = req.headers['accept-encoding'] ?? '';
  if (typeof acceptEncoding === 'string' && acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="offline-snapshot-${eventId}.json.gz"`
    );

    const gzip = createGzip();
    gzip.pipe(res);
    gzip.end(jsonBody);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="offline-snapshot-${eventId}.json"`
    );
    res.send(jsonBody);
  }
}
