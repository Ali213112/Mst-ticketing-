import type { Request, Response } from 'express';
import { createCheckout, getOrderStatus } from './payments.service.js';

export async function checkoutHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
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

  const result = await createCheckout({
    userId: req.user.userId,
    idempotencyKey,
    body: req.body,
  });

  if ('error' in result) {
    res.status(result.status).json({ success: false, error: result.error, code: result.code });
    return;
  }

  res.status(201).json({ success: true, data: result });
}

export async function getOrderHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getOrderStatus(req.user.userId, req.params.orderId as string);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.order });
}
