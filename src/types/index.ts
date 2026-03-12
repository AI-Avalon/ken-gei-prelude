// Ken-Gei Prelude — TypeScript Type Definitions

export interface Venue {
  name: string;
  address?: string;
  postal?: string;
  lat?: number;
  lng?: number;
  tel?: string;
  access?: string[];
  parking?: string;
}

export interface PricingItem {
  label: string;
  amount: number;
  note?: string;
}

export interface ProgramItem {
  composer: string;
  piece: string;
}

export interface Performer {
  name: string;
  year?: string;
  instrument?: string;
}

export interface Concert {
  id: string;
  slug: string;
  fingerprint?: string;

  title: string;
  subtitle: string;
  description: string;

  date: string;
  time_open: string;
  time_start: string;
  time_end: string;

  venue: Venue;
  venue_json?: string;

  category: string;
  departments: string[];
  departments_json?: string;
  instruments: string[];
  instruments_json?: string;
  tags: string[];
  tags_json?: string;

  pricing: PricingItem[];
  pricing_json?: string;
  pricing_note: string;

  seating: string;
  ticket_url: string;
  ticket_note: string;

  program: ProgramItem[];
  program_json?: string;
  performers: Performer[];
  performers_json?: string;
  supervisors: string[];
  supervisors_json?: string;
  guest_artists: string[];
  guest_artists_json?: string;

  contact_email: string;
  contact_tel: string;
  contact_person: string;
  contact_url: string;

  flyer_r2_keys: string[];
  flyer_thumbnail_key: string;

  views: number;

  source: 'manual' | 'quick' | 'auto_scrape';
  source_url: string;

  is_published: number;
  is_featured: number;
  is_deleted: number;
  deleted_at: string;

  edit_password_hash: string;

  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ConcertRow {
  id: string;
  slug: string;
  fingerprint: string | null | undefined;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  time_open: string;
  time_start: string;
  time_end: string;
  venue_json: string;
  category: string;
  departments_json: string;
  instruments_json: string;
  tags_json: string;
  pricing_json: string;
  pricing_note: string;
  seating: string;
  ticket_url: string;
  ticket_note: string;
  program_json: string;
  performers_json: string;
  supervisors_json: string;
  guest_artists_json: string;
  contact_email: string;
  contact_tel: string;
  contact_person: string;
  contact_url: string;
  flyer_r2_keys: string;
  flyer_thumbnail_key: string;
  views: number;
  source: string;
  source_url: string;
  is_published: number;
  is_featured: number;
  is_deleted: number;
  deleted_at: string;
  edit_password_hash: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Inquiry {
  id: number;
  name_encrypted: string;
  email_encrypted: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
  concert_id: string;
  status: 'unread' | 'read' | 'replied';
  admin_note: string;
  created_at: string;
}

export interface VenueRecord {
  id: string;
  name: string;
  data_json: string;
}

export interface MaintenanceLogEntry {
  id: number;
  task: string;
  result: string;
  details: string;
  executed_at: string;
}

export interface AnalyticsRow {
  id: number;
  concert_id: string;
  viewed_at: string;
  referrer: string;
  user_agent: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  total?: number;
}

// Env interface is defined in functions/api/ files using @cloudflare/workers-types

export function parseConcertRow(row: ConcertRow): Concert {
  return {
    ...row,
    fingerprint: row.fingerprint ?? undefined,
    venue: safeJsonParse(row.venue_json, { name: '' }),
    departments: safeJsonParse(row.departments_json, []),
    instruments: safeJsonParse(row.instruments_json, []),
    tags: safeJsonParse(row.tags_json, []),
    pricing: safeJsonParse(row.pricing_json, [{ label: '入場料', amount: 0 }]),
    program: safeJsonParse(row.program_json, []),
    performers: safeJsonParse(row.performers_json, []),
    supervisors: safeJsonParse(row.supervisors_json, []),
    guest_artists: safeJsonParse(row.guest_artists_json, []),
    flyer_r2_keys: safeJsonParse(row.flyer_r2_keys, []),
    source: row.source as Concert['source'],
  };
}

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
