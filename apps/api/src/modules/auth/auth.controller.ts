import type { Request, Response } from 'express';
import {
  acceptInviteSession,
  acceptInviteSchema,
  getMe,
  getPlatformAdminMe,
  logoutSession,
  platformAdminLogin,
  platformLoginSchema,
  refreshSession,
  verifyBodySchema,
  verifyWeb3AuthLogin,
} from './auth.service.js';
import { clearAuthCookies, setAuthCookies } from './auth.cookies.js';

export async function verifyHandler(req: Request, res: Response): Promise<void> {
  const parsed = verifyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const session = await verifyWeb3AuthLogin(parsed.data.idToken, parsed.data.walletAddress);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.json({ success: true, data: session.user });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[auth/verify] failed:', error);
    }
    const message = error instanceof Error ? error.message : 'Invalid Web3Auth token';
    const isDbError = message.includes('duplicate key') || message.includes('violates');
    res.status(401).json({
      success: false,
      error: isDbError ? 'Could not create user account' : 'Invalid Web3Auth token',
      code: isDbError ? 'USER_CREATE_FAILED' : 'INVALID_ID_TOKEN',
      ...(process.env.NODE_ENV === 'development' ? { detail: message } : {}),
    });
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  if (!refreshToken) {
    clearAuthCookies(res);
    res.status(401).json({ success: false, error: 'Refresh token required' });
    return;
  }

  const session = await refreshSession(refreshToken);
  if (!session) {
    clearAuthCookies(res);
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
    return;
  }

  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json({ success: true });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  await logoutSession(refreshToken);
  clearAuthCookies(res);
  res.json({ success: true });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const user = req.user.isPlatformAdmin
    ? await getPlatformAdminMe(req.user.userId)
    : await getMe(req.user.userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
}

export async function acceptInviteHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid invite token' });
    return;
  }

  const result = await acceptInviteSession(req.user.userId, parsed.data.inviteToken);
  if ('error' in result) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({ success: true, data: result.user });
}

export async function platformLoginHandler(req: Request, res: Response): Promise<void> {
  const parsed = platformLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid credentials format' });
    return;
  }

  const session = await platformAdminLogin(parsed.data.email, parsed.data.password);
  if (!session) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  setAuthCookies(res, session.accessToken, session.refreshToken);
  res.json({
    success: true,
    data: { adminId: session.adminId, role: 99 },
  });
}
