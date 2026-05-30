import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { alertLogs } from './schema.js'
import { toIsoTimestamp } from './time.js'

const toAlertPayload = (row) => ({
  id: row.id,
  timestamp: toIsoTimestamp(row.timestamp),
  temperature: row.temperature,
  humidex: row.humidex ?? null,
  humidity: row.humidity ?? null,
  alertLevel: row.alertLevel,
  lat: row.lat ?? null,
  lng: row.lng ?? null,
  zone: row.zone ?? null
})

export const createAlertStore = (database) => {
  if (!database) {
    throw new Error(
      'createAlertStore requires a database instance. ' +
        'Pass a Drizzle db via createAlertStore(db).'
    )
  }

  const logAlert = async (alert) => {
    const row = {
      timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
      temperature: alert.temperature,
      humidex: alert.humidex ?? null,
      humidity: alert.humidity ?? null,
      alertLevel: alert.alertLevel,
      lat: alert.lat ?? null,
      lng: alert.lng ?? null,
      zone: alert.zone ?? null
    }

    await database.insert(alertLogs).values(row)
    return row
  }

  const listAlerts = async ({ from, to, level, zone, limit = 50 } = {}) => {
    const conditions = []
    if (from) {
      conditions.push(gte(alertLogs.timestamp, from.toISOString()))
    }
    if (to) {
      conditions.push(lte(alertLogs.timestamp, to.toISOString()))
    }
    if (level) {
      conditions.push(eq(alertLogs.alertLevel, level))
    }
    if (zone) {
      conditions.push(eq(alertLogs.zone, zone))
    }

    const rows = await database
      .select()
      .from(alertLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alertLogs.id))
      .limit(limit)

    return rows.map(toAlertPayload)
  }

  return {
    logAlert,
    listAlerts
  }
}
