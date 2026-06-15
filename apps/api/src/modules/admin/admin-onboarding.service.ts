import type { OnboardingStatus } from '@ticketchain/shared';
import {
  countOrgInvites,
  findOrganisationById,
  orgHasKycDocuments,
} from '../org/org.repository.js';
import { pool } from '../../shared/db/postgres.service.js';

function calcProfilePercent(org: NonNullable<Awaited<ReturnType<typeof findOrganisationById>>>): number {
  const checks = [
    Boolean(org.description),
    Boolean(org.logoUrl),
    Boolean(org.websiteUrl),
    Boolean(org.brandPrimaryColor),
    Boolean(org.country),
    Boolean(org.city),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export async function getOnboardingStatus(orgId: string): Promise<OnboardingStatus | null> {
  const org = await findOrganisationById(orgId);
  if (!org) return null;

  const profilePercent = calcProfilePercent(org);
  const profileComplete = profilePercent >= 80;
  const kycSubmitted =
    org.verificationStatus === 'under_review' ||
    org.verificationStatus === 'verified' ||
    (await orgHasKycDocuments(orgId));
  const kycVerified = org.verificationStatus === 'verified';
  const walletConfirmed = Boolean(org.walletConfirmedAt);
  const inviteCount = await countOrgInvites(orgId);
  const teamInvited = inviteCount > 0;

  const readyForEvents = profileComplete && kycVerified && walletConfirmed;

  return {
    profileComplete,
    profilePercent,
    kycSubmitted,
    kycVerified,
    walletConfirmed,
    teamInvited,
    readyForEvents,
    verificationStatus: org.verificationStatus,
  };
}

export async function confirmOrgWallet(orgId: string, walletAddress: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE organisations SET
       super_admin_wallet_address = $1,
       wallet_confirmed_at = NOW(),
       updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL`,
    [walletAddress.toLowerCase(), orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

export function isOrgKycVerified(orgId: string): Promise<boolean> {
  return findOrganisationById(orgId).then((org) => org?.verificationStatus === 'verified');
}
