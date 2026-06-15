import { z } from 'zod';
import {
  createVenue,
  listVenuesByOrg,
  softDeleteVenue,
  updateVenue,
} from '../venue/venue.repository.js';

const createVenueSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().min(1).optional(),
  seatMap: z.unknown().optional(),
});

const updateVenueSchema = createVenueSchema.partial();

export async function adminListVenues(orgId: string) {
  const venues = await listVenuesByOrg(orgId);
  return { venues };
}

export async function adminCreateVenue(orgId: string, body: unknown) {
  const parsed = createVenueSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid venue request', status: 400 as const };
  const venue = await createVenue(orgId, parsed.data);
  return { venue, status: 201 as const };
}

export async function adminUpdateVenue(orgId: string, venueId: string, body: unknown) {
  const parsed = updateVenueSchema.safeParse(body);
  if (!parsed.success) return { error: 'Invalid venue request', status: 400 as const };

  const fields: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) fields.name = d.name;
  if (d.address !== undefined) fields.address = d.address;
  if (d.city !== undefined) fields.city = d.city;
  if (d.country !== undefined) fields.country = d.country;
  if (d.latitude !== undefined) fields.latitude = d.latitude;
  if (d.longitude !== undefined) fields.longitude = d.longitude;
  if (d.capacity !== undefined) fields.capacity = d.capacity;
  if (d.seatMap !== undefined) fields.seat_map = JSON.stringify(d.seatMap);

  const venue = await updateVenue(orgId, venueId, fields);
  if (!venue) return { error: 'Venue not found', status: 404 as const };
  return { venue };
}

export async function adminDeleteVenue(orgId: string, venueId: string) {
  const deleted = await softDeleteVenue(orgId, venueId);
  if (!deleted) return { error: 'Venue not found', status: 404 as const };
  return { success: true };
}
