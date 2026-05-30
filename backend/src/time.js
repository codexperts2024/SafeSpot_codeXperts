// Normalizes a timestamp column value to an ISO 8601 string for API payloads.
// Real Postgres returns `Date` objects for timestamptz columns (via drizzle's
// default `mode: 'date'`), while the in-memory test database stores whatever raw
// value was inserted (often already an ISO string). This keeps the wire format
// stable (`...Z`) regardless of source.
export const toIsoTimestamp = (value) =>
  value instanceof Date ? value.toISOString() : value
