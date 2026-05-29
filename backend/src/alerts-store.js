import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { alertLogs } from './schema.js'

const toAlertPayload = (row) => ({
  id: row.id,
  timestamp: row.timestamp,
  temperature: row.temperature,
  humidex: row.humidex ?? null,
  humidity: row.humidity ?? null,
  alertLevel: row.alertLevel,
  lat: row.lat ?? null,
  lng: row.lng ?? null,
  zone: row.zone ?? null
})

export const createAlertStore = (database) => {
  const memoryLogs = []

  const logAlert = async (alert) => {
    const row = {
      timestamp: alert.timestamp ?? new Date().toISOString(),
      temperature: alert.temperature,
      humidex: alert.humidex ?? null,
      humidity: alert.humidity ?? null,
      alertLevel: alert.alertLevel,
      lat: alert.lat ?? null,
      lng: alert.lng ?? null,
      zone: alert.zone ?? null
    }

    if (database?.insert) {
      await database.insert(alertLogs).values(row)
      return row
    }

    const stored = { ...row, id: memoryLogs.length + 1 }
    memoryLogs.push(stored)
    return stored
  }

  const listAlerts = async ({ from, to, level, zone, limit = 50 } = {}) => {
    if (database?.select) {
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

    // In-memory fallback for tests
    return memoryLogs
      .map(toAlertPayload)
      .filter((row) => {
        const timestamp = new Date(row.timestamp).getTime()
        if (Number.isNaN(timestamp)) {
          return false
        }

        if (from && timestamp < from.getTime()) {
          return false
        }

        if (to && timestamp > to.getTime()) {
          return false
        }

        if (level && row.alertLevel !== level) {
          return false
        }

        if (zone && row.zone !== zone) {
          return false
        }

        return true
      })
      .sort((left, right) => (right.id ?? 0) - (left.id ?? 0))
      .slice(0, limit)
  }

  return {
    logAlert,
    listAlerts
  }
}
