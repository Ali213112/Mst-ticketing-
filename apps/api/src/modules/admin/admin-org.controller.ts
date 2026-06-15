import type { Request, Response } from 'express';
import {
  adminGetOrganisation,
  adminInviteMember,
  adminListInvites,
  adminListMembers,
  adminRemoveMember,
  adminSubmitKyc,
  adminUpdateMember,
  adminUpdateOrganisation,
  adminUploadOrgAsset,
} from './admin-org.service.js';

export async function getOrganisationHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminGetOrganisation(orgId);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: { ...result.org, stats: result.stats } });
}

export async function updateOrganisationHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminUpdateOrganisation(orgId, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

export async function submitKycHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminSubmitKyc(orgId, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

export async function listMembersHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminListMembers(orgId);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.members });
}

export async function inviteMemberHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const orgId = req.orgId!;
  const result = await adminInviteMember(orgId, req.user.userId, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }

  res.status(result.status).json({
    success: true,
    data: result.invite,
    ...(process.env.NODE_ENV === 'development' ? { inviteToken: result.inviteToken } : {}),
  });
}

export async function updateMemberHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminUpdateMember(orgId, req.params.memberId as string, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.member });
}

export async function removeMemberHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const orgId = req.orgId!;
  const result = await adminRemoveMember(orgId, req.params.memberId as string, req.user.userId);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true });
}

export async function uploadOrgAssetHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminUploadOrgAsset(orgId, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result });
}

export async function listInvitesHandler(req: Request, res: Response): Promise<void> {
  const orgId = req.orgId!;
  const result = await adminListInvites(orgId);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.invites });
}
