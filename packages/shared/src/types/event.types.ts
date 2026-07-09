export type EventStatus = 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
export type TierStatus = 'draft' | 'active' | 'sold_out' | 'disabled';

export interface EventSummary {
  id: string;
  orgId: string;
  name: string;
  category: string | null;
  city: string | null;
  country: string | null;
  eventDate: string;
  status: EventStatus;
  imageIpfsUrl: string | null;
  totalTicketsSold: number;
  createdAt: string;
  updatedAt: string;
  contractAddress?: string | null;
  totalCheckedIn?: number;
  totalRevenueWei?: string;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  imageIpfsHash: string | null;
  tags: string[] | null;
  ageRestriction: number | null;
  eventEndDate: string | null;
  venueId: string | null;
  venueName: string | null;
  latitude: number | null;
  longitude: number | null;
  zones: unknown;
  contractAddress: string | null;
  contractDeploymentTx: string | null;
  chainId: number;
  resaleEnabled: boolean;
  resalePriceCapBps: number | null;
  resaleRoyaltyBps: number | null;
  totalRevenueWei: string;
  totalCheckedIn: number;
  publishedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
}

export interface TierResponse {
  id: string;
  eventId: string;
  tierIndex: number;
  name: string;
  description: string | null;
  zone: string | null;
  totalSupply: number;
  minted: number;
  maxPerWallet: number;
  priceWei: string;
  priceDisplay: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  earlyBirdEndAt: string | null;
  earlyBirdPriceWei: string | null;
  isTransferable: boolean;
  royaltyBps: number;
  metadataIpfsHash: string | null;
  metadataIpfsUri: string | null;
  resaleEnabled: boolean | null;
  resalePriceCapBps: number | null;
  status: TierStatus;
  createdAt: string;
}
