import type { Request, Response } from 'express';
import { confirmOrgWallet, getOnboardingStatus } from './admin-onboarding.service.js';

export async function getOnboardingStatusHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const status = await getOnboardingStatus(orgId);
  if (!status) {
    res.status(404).json({ success: false, error: 'Organisation not found' });
    return;
  }
  res.json({ success: true, data: status });
}

export async function confirmWalletHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const { walletAddress } = req.body as { walletAddress?: string };

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    res.status(400).json({ success: false, error: 'Valid wallet address required' });
    return;
  }

  const ok = await confirmOrgWallet(orgId, walletAddress);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Organisation not found' });
    return;
  }

  const status = await getOnboardingStatus(orgId);
  res.json({ success: true, data: status });
}
