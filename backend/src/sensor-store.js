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

const newestFirst = (left, right) => {
  const leftTime = new Date(left.createdAt).getTime()
  const rightTime = new Date(right.createdAt).getTime()

  if (
    !Number.isNaN(leftTime) &&
    !Number.isNaN(rightTime) &&
    leftTime !== rightTime
  ) {
    return rightTime - leftTime
  }

  return (right.id ?? 0) - (left.id ?? 0)
}

const getLatestReadingBySource = (rows, source) =>
  rows
    .filter((row) => row.source === source)
    .sort(newestFirst)[0] ?? null

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

  const getAllReadings = async () => database.select().from(sensorReadings)

  const save = async (temperature, source, humidity = null, metadata = {}) => {
    const createdAt = new Date().toISOString()
    const humidex = calculateHumidex(temperature, humidity)
    const alert = getAlertLevel(humidex ?? temperature)

    const shouldStore =
      source === 'sensor'
        ? shouldStoreSensorReading(
            getLatestReadingBySource(await getAllReadings(), 'sensor'),
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
    const readings = await getAllReadings()
    const latestReading = readings.sort(newestFirst)[0]

    return toReadingPayload(latestReading)
  }

  const listReadings = async ({ from, to, limit = 100 } = {}) => {
    const readings = await getAllReadings()

    return readings
      .map(toReadingPayload)
      .filter((reading) => {
        const timestamp = new Date(reading.timestamp).getTime()

        if (Number.isNaN(timestamp)) {
          return false
        }

        if (from && timestamp < from.getTime()) {
          return false
        }

        if (to && timestamp > to.getTime()) {
          return false
        }

        return true
      })
      .sort((left, right) => {
        const leftTime = new Date(left.timestamp).getTime()
        const rightTime = new Date(right.timestamp).getTime()
        return rightTime - leftTime
      })
      .slice(0, limit)
  }

  return {
    save,
    getLatest,
    listReadings
  }
}
