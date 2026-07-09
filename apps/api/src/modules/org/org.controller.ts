import type { Request, Response } from 'express';
import { findUserById } from '../auth/auth.repository.js';
import {
  acceptOrgInvite,
  getMyOrganisations,
  getOrgProfile,
  getPublicOrgBySlug,
  getMyInvites,
} from './org.service.js';

export async function listMyInvitesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const user = await findUserById(req.user.userId);
    if (!user?.email) {
      res.json({ success: true, data: [] });
      return;
    }

    const invites = await getMyInvites(user.email);
    res.json({ success: true, data: invites });
  } catch (error) {
    console.error('[orgs/invites/pending] failed:', error);
    res.status(500).json({ success: false, error: 'Failed to load invites' });
  }
}

/**
 * GET /api/orgs/me
 * Returns all organisations the authenticated user belongs to.
 */
export async function listMyOrgsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await getMyOrganisations(req.user.userId);
  res.json({ success: true, data: result.orgs });
}

/**
 * GET /api/orgs/:orgId
 * Returns org profile for a member of that org.
 */
export async function getOrgProfileHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const orgId = req.params.orgId as string;
  const result = await getOrgProfile(orgId, req.user.userId);
  if ('error' in result) {
    res.status(result.status ?? 403).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

/**
 * GET /api/orgs/slug/:slug
 * Public: Returns org's public profile by slug (no auth required).
 */
export async function getOrgBySlugHandler(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug as string;
  const result = await getPublicOrgBySlug(slug);
  if ('error' in result) {
    res.status(result.status ?? 404).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

/**
 * POST /api/orgs/accept-invite
 * Accepts an organisation invite token (alternative to /api/auth/accept-invite).
 */
export async function acceptInviteHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, error: 'Invite token is required' });
    return;
  }

  const result = await acceptOrgInvite({ token, userId: req.user.userId });
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({
    success: true,
    data: {
      org: result.org,
      orgId: result.orgId,
      role: result.role,
    },
  });
}
