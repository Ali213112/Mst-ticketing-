import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import {
  generateTicketQr,
  getMyTickets,
  getTicket,
  mintTickets,
} from './tickets.service.js';

export async function mintHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (env.NODE_ENV === 'production' && !env.ALLOW_DIRECT_MINT) {
    res.status(403).json({
      success: false,
      error: 'Direct mint is disabled in production. Use POST /api/tickets/checkout',
      code: 'USE_CHECKOUT',
    });
    return;
  }

  const idempotencyKey = req.header('idempotency-key');
  if (!idempotencyKey || idempotencyKey.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Idempotency-Key header is required (min 8 characters)',
      code: 'MISSING_IDEMPOTENCY_KEY',
    });
    return;
  }

  const result = await mintTickets({
    userId: req.user.userId,
    idempotencyKey,
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

  res.status(201).json({
    success: true,
    data: {
      tickets: result.tickets,
      transactionHash: result.transactionHash,
      totalPaidWei: result.totalPaidWei,
    },
  });
}

export async function listMyTicketsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getMyTickets(req.user.userId, req.query as Record<string, string | undefined>);
  res.json({ success: true, data: result.rows, meta: result.meta });
}

export async function getTicketHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getTicket(req.user.userId, req.params.ticketId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.ticket });
}

export async function getTicketQrHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await generateTicketQr(req.user.userId, req.params.ticketId as string);
  if ('error' in result) {
    res.status(result.status ?? 400).json({
      success: false,
      error: result.error,
      code: 'code' in result ? result.code : undefined,
    });
    return;
  }
  res.json({ success: true, data: result });
}
