import { pool } from '../../shared/db/postgres.service.js';

export interface ResaleListingRow {
  id: string;
  ticket_id: string;
  event_id: string;
  tier_id: string;
  seller_user_id: string;
  seller_wallet: string;
  face_price_wei: string;
  ask_price_wei: string;
  max_price_wei: string;
  status: string;
  on_chain_listing_id: number | null;
  buyer_user_id: string | null;
  created_at: Date;
}

export async function listActiveListings(): Promise<ResaleListingRow[]> {
  const result = await pool.query<ResaleListingRow>(
    `SELECT id, ticket_id, event_id, tier_id, seller_user_id, seller_wallet,
            face_price_wei::text, ask_price_wei::text, max_price_wei::text,
            status, on_chain_listing_id, buyer_user_id, created_at
     FROM resale_listings
     WHERE status = 'active'
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function findListingById(listingId: string): Promise<ResaleListingRow | null> {
  const result = await pool.query<ResaleListingRow>(
    `SELECT id, ticket_id, event_id, tier_id, seller_user_id, seller_wallet,
            face_price_wei::text, ask_price_wei::text, max_price_wei::text,
            status, on_chain_listing_id, buyer_user_id, created_at
     FROM resale_listings WHERE id = $1`,
    [listingId]
  );
  return result.rows[0] ?? null;
}

export async function findListingByTicketId(ticketId: string): Promise<ResaleListingRow | null> {
  const result = await pool.query<ResaleListingRow>(
    `SELECT id, ticket_id, event_id, tier_id, seller_user_id, seller_wallet,
            face_price_wei::text, ask_price_wei::text, max_price_wei::text,
            status, on_chain_listing_id, buyer_user_id, created_at
     FROM resale_listings WHERE ticket_id = $1 AND status = 'active'`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function createListing(params: {
  ticketId: string;
  eventId: string;
  tierId: string;
  sellerUserId: string;
  sellerWallet: string;
  facePriceWei: string;
  askPriceWei: string;
  maxPriceWei: string;
  onChainListingId?: number;
}): Promise<ResaleListingRow> {
  const result = await pool.query<ResaleListingRow>(
    `INSERT INTO resale_listings (
       ticket_id, event_id, tier_id, seller_user_id, seller_wallet,
       face_price_wei, ask_price_wei, max_price_wei, on_chain_listing_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, ticket_id, event_id, tier_id, seller_user_id, seller_wallet,
               face_price_wei::text, ask_price_wei::text, max_price_wei::text,
               status, on_chain_listing_id, buyer_user_id, created_at`,
    [
      params.ticketId,
      params.eventId,
      params.tierId,
      params.sellerUserId,
      params.sellerWallet.toLowerCase(),
      params.facePriceWei,
      params.askPriceWei,
      params.maxPriceWei,
      params.onChainListingId ?? null,
    ]
  );
  return result.rows[0];
}

export async function cancelListing(listingId: string): Promise<void> {
  await pool.query(
    `UPDATE resale_listings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [listingId]
  );
}

export async function markListingSold(params: {
  listingId: string;
  buyerUserId: string;
  salePriceWei: string;
}): Promise<void> {
  await pool.query(
    `UPDATE resale_listings SET
       status = 'sold',
       buyer_user_id = $1,
       sale_price_wei = $2,
       sold_at = NOW(),
       updated_at = NOW()
     WHERE id = $3`,
    [params.buyerUserId, params.salePriceWei, params.listingId]
  );
}
