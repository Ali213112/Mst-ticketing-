import { pool } from '../../shared/db/postgres.service.js';

export interface VenueRow {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  capacity: number | null;
  seat_map: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface VenueSummary {
  id: string;
  orgId: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  seatMap: unknown;
  createdAt: string;
  updatedAt: string;
}

function mapVenue(row: VenueRow): VenueSummary {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    capacity: row.capacity,
    seatMap: row.seat_map,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listVenuesByOrg(orgId: string): Promise<VenueSummary[]> {
  const result = await pool.query<VenueRow>(
    `SELECT id, org_id, name, address, city, country, latitude, longitude, capacity, seat_map, created_at, updated_at
     FROM venues WHERE org_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
    [orgId]
  );
  return result.rows.map(mapVenue);
}

export async function findVenueById(orgId: string, venueId: string): Promise<VenueSummary | null> {
  const result = await pool.query<VenueRow>(
    `SELECT id, org_id, name, address, city, country, latitude, longitude, capacity, seat_map, created_at, updated_at
     FROM venues WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [venueId, orgId]
  );
  const row = result.rows[0];
  return row ? mapVenue(row) : null;
}

export async function createVenue(
  orgId: string,
  params: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    capacity?: number;
    seatMap?: unknown;
  }
): Promise<VenueSummary> {
  const result = await pool.query<VenueRow>(
    `INSERT INTO venues (org_id, name, address, city, country, latitude, longitude, capacity, seat_map)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, org_id, name, address, city, country, latitude, longitude, capacity, seat_map, created_at, updated_at`,
    [
      orgId,
      params.name,
      params.address ?? null,
      params.city ?? null,
      params.country ?? null,
      params.latitude ?? null,
      params.longitude ?? null,
      params.capacity ?? null,
      params.seatMap ? JSON.stringify(params.seatMap) : null,
    ]
  );
  return mapVenue(result.rows[0]!);
}

export async function updateVenue(
  orgId: string,
  venueId: string,
  fields: Record<string, unknown>
): Promise<VenueSummary | null> {
  const allowed = ['name', 'address', 'city', 'country', 'latitude', 'longitude', 'capacity', 'seat_map'] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return findVenueById(orgId, venueId);

  values.push(venueId, orgId);
  const result = await pool.query<VenueRow>(
    `UPDATE venues SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND org_id = $${values.length} AND deleted_at IS NULL
     RETURNING id, org_id, name, address, city, country, latitude, longitude, capacity, seat_map, created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? mapVenue(row) : null;
}

export async function softDeleteVenue(orgId: string, venueId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE venues SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [venueId, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}
