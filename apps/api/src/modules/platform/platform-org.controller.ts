import type { Request, Response } from 'express';
import {
  platformCreateOrganisation,
  platformDeleteOrganisation,
  platformGetOrganisation,
  platformListOrganisations,
  platformUpdateOrganisation,
  platformUpdateOrganisationStatus,
  platformVerifyOrganisation,
} from './platform-org.service.js';

export async function listOrganisationsHandler(req: Request, res: Response): Promise<void> {
  const result = await platformListOrganisations(req.query as Record<string, string | undefined>);
  res.json({ success: true, data: result.rows, meta: result.meta });
}

export async function createOrganisationHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await platformCreateOrganisation(req.body, req.user.userId);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.status(result.status).json({
    success: true,
    data: result.org,
    founderInvite: result.founderInvite,
  });
}

export async function getOrganisationHandler(req: Request, res: Response): Promise<void> {
  const result = await platformGetOrganisation(req.params.orgId as string);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

export async function updateOrganisationHandler(req: Request, res: Response): Promise<void> {
  const result = await platformUpdateOrganisation(req.params.orgId as string, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

export async function deleteOrganisationHandler(req: Request, res: Response): Promise<void> {
  const result = await platformDeleteOrganisation(req.params.orgId as string);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true });
}

export async function updateOrganisationStatusHandler(req: Request, res: Response): Promise<void> {
  const result = await platformUpdateOrganisationStatus(req.params.orgId as string, req.body);
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}

export async function verifyOrganisationHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const result = await platformVerifyOrganisation(
    req.params.orgId as string,
    req.body,
    req.user.userId
  );
  if ('error' in result) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.org });
}
