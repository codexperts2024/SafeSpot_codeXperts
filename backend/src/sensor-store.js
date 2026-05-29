import { and, desc, eq, gte, lte, lt } from 'drizzle-orm'
import { calculateHumidex } from './humidex.js'
import { getAlertLevel } from './alerts.js'
import { createAlertStore } from './alerts-store.js'
import { sensorReadings } from './schema.js'

const toReadingPayload = (reading) => {
  if (!reading) {
    return null
  }

  return {
    temperature: reading.temperature,
    humidity: reading.humidity ?? null,
    humidex: reading.humidex ?? null,
    timestamp: reading.createdAt,
    source: reading.source
  }
}

const shouldStoreSensorReading = (latestSensorReading, level, timestamp) => {
  if (!latestSensorReading) {
    return true
  }

  if (level === 'danger' || level === 'extreme') {
    return true
  }

  const lastRecordedAt = new Date(latestSensorReading.createdAt).getTime()
  const now = new Date(timestamp).getTime()

  if (Number.isNaN(lastRecordedAt) || Number.isNaN(now)) {
    return true
  }

  const elapsed = now - lastRecordedAt
  const minimumInterval = level === 'caution' ? 60_000 : 5 * 60_000

  return elapsed >= minimumInterval
}

export const createSensorStore = (database, { alertStore } = {}) => {
  if (!database) {
    throw new Error(
      'createSensorStore requires a database instance. ' +
        'Pass a Drizzle db via createSensorStore(db).'
    )
  }

  const alerts = alertStore ?? createAlertStore(database)

  const save = async (temperature, source, humidity = null, metadata = {}) => {
    const createdAt = new Date().toISOString()
    const humidex = calculateHumidex(temperature, humidity)
    const alert = getAlertLevel(humidex ?? temperature)

    const shouldStore =
      source === 'sensor'
        ? shouldStoreSensorReading(
            (
              await database
                .select()
                .from(sensorReadings)
                .where(eq(sensorReadings.source, 'sensor'))
                .orderBy(desc(sensorReadings.id))
                .limit(1)
            )[0] ?? null,
            alert.level,
            createdAt
          )
        : true

    if (shouldStore) {
      await database
        .insert(sensorReadings)
        .values({
          temperature,
          humidity,
          humidex,
          source,
          createdAt
        })
    }

    if (alert.level !== 'safe') {
      await alerts.logAlert({
        timestamp: createdAt,
        temperature,
        humidex,
        humidity,
        alertLevel: alert.level,
        lat: metadata?.lat,
        lng: metadata?.lng,
        zone: metadata?.zone
      })
    }

    return {
      temperature,
      humidity,
      humidex,
      timestamp: createdAt,
      source
    }
  }

  const getLatest = async () => {
    const rows = await database
      .select()
      .from(sensorReadings)
      .orderBy(desc(sensorReadings.id))
      .limit(1)

    return toReadingPayload(rows[0] ?? null)
  }

  const listReadings = async ({ from, to, limit = 100 } = {}) => {
    const conditions = []
    if (from) {
      conditions.push(gte(sensorReadings.createdAt, from.toISOString()))
    }
    if (to) {
      conditions.push(lte(sensorReadings.createdAt, to.toISOString()))
    }

    const rows = await database
      .select()
      .from(sensorReadings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sensorReadings.id))
      .limit(limit)

    return rows.map(toReadingPayload)
  }

  return {
    save,
    getLatest,
    listReadings
  }
}
