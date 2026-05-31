export type OrgStatus = 'pending_verification' | 'active' | 'suspended' | 'inactive';
export type OrgVerificationStatus = 'unverified' | 'under_review' | 'verified' | 'rejected';
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise';
export type OrgMemberStatus = 'active' | 'inactive' | 'suspended';
export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface OrganisationSummary {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  verificationStatus: OrgVerificationStatus;
  subscriptionPlan: SubscriptionPlan;
  country: string | null;
  city: string | null;
  createdAt: string;
}

export interface OrganisationDetail extends OrganisationSummary {
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  superAdminId: string;
  superAdminWalletAddress: string;
  orgRegistryContractAddress: string | null;
  chainId: number;
  platformCommissionBps: number;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface OrgMemberResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: number;
  status: OrgMemberStatus;
  assignedAt: string;
}

export interface InviteResponse {
  id: string;
  inviteeEmail: string;
  roleToAssign: number;
  status: InviteStatus;
  tokenExpiresAt: string;
  createdAt: string;
}
