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

const sortNewestFirst = (left, right) => {
  const leftTime = new Date(left.timestamp).getTime()
  const rightTime = new Date(right.timestamp).getTime()

  if (leftTime !== rightTime) {
    return rightTime - leftTime
  }

  return (right.id ?? 0) - (left.id ?? 0)
}

export const createAlertStore = (database) => {
  const memoryLogs = []

  const getRows = async () => {
    if (database?.select) {
      return database.select().from(alertLogs)
    }

    return memoryLogs
  }

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
    const rows = await getRows()
    const filtered = rows
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
      .sort(sortNewestFirst)

    return filtered.slice(0, limit)
  }

  return {
    logAlert,
    listAlerts
  }
}
