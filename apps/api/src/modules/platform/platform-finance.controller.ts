import type { Request, Response } from 'express';
import { listAuditLogs } from '../../shared/audit/audit-log.service.js';
import { listFraudAlerts, setWalletBlacklist } from '../../shared/fraud/fraud.service.js';
import { getPlatformKPIs } from './platform-kpis.service.js';
import { approveSettlement, listSettlements } from './platform-settlements.service.js';

export async function getKpisHandler(_req: Request, res: Response): Promise<void> {
  const data = await getPlatformKPIs();
  res.json({ success: true, data });
}

export async function listSettlementsHandler(_req: Request, res: Response): Promise<void> {
  const data = await listSettlements();
  res.json({ success: true, data });
}

export async function approveSettlementHandler(req: Request, res: Response): Promise<void> {
  const result = await approveSettlement(
    req.params.settlementId as string,
    req.user?.userId ?? ''
  );
  if ('error' in result) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true });
}

export async function listFraudHandler(_req: Request, res: Response): Promise<void> {
  const data = await listFraudAlerts({ limit: 100, offset: 0 });
  res.json({ success: true, data });
}

export async function blacklistHandler(req: Request, res: Response): Promise<void> {
  const { walletAddress, blacklist } = req.body as {
    walletAddress?: string;
    blacklist?: boolean;
  };
  if (!walletAddress || typeof blacklist !== 'boolean') {
    res.status(400).json({ success: false, error: 'walletAddress and blacklist required' });
    return;
  }
  await setWalletBlacklist(walletAddress, blacklist, req.user?.userId);
  res.json({ success: true });
}

export async function listAuditHandler(_req: Request, res: Response): Promise<void> {
  const result = await listAuditLogs({ limit: 100, offset: 0 });
  res.json({ success: true, data: result.rows });
}
