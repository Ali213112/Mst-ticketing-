import type { Request, Response } from 'express';
import { getReferralStats, listUserRewards, updateUserProfile } from './profile.service.js';

export async function listRewardsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const data = await listUserRewards(req.user.userId);
  res.json({ success: true, data });
}

export async function getReferralHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const data = await getReferralStats(req.user.userId);
  res.json({ success: true, data });
}

export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (req.user.isPlatformAdmin) {
    res.status(403).json({ success: false, error: 'Platform admins cannot update profile here' });
    return;
  }

  const result = await updateUserProfile(req.user.userId, req.body);
  if ('error' in result) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.profile });
}
