import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { ROLES, type Role } from '@ticketchain/shared';

export async function authenticateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.isPlatformAdmin) {
      next();
      return;
    }
    if (!req.user || req.user.role < minRole) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function resolveOrgContext(req: Request, res: Response, next: NextFunction): void {
  const queryOrgId = typeof req.query.orgId === 'string' ? req.query.orgId : undefined;
  const orgId =
    (req.params.orgId as string | undefined) ?? queryOrgId ?? req.user?.orgIds[0];
  if (!orgId) {
    res.status(403).json({ success: false, error: 'No organisation context' });
    return;
  }
  req.orgId = orgId;
  next();
}

export function requireOrgMembership(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.orgId ?? (req.params.orgId as string | undefined) ?? req.user?.orgIds[0];
  if (req.user?.isPlatformAdmin) {
    if (orgId) req.orgId = orgId;
    next();
    return;
  }
  if (!orgId || !req.user?.orgIds.includes(orgId)) {
    res.status(403).json({ success: false, error: 'Not a member of this organisation' });
    return;
  }
  req.orgId = orgId;
  next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isPlatformAdmin || req.user.role !== ROLES.PLATFORM_ADMIN) {
    res.status(403).json({ success: false, error: 'Platform admin access required' });
    return;
  }
  next();
}
