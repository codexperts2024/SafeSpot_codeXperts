import { desc } from 'drizzle-orm'
import { sensorReadings } from './schema.js'

const toReadingPayload = (reading) => {
  if (!reading) {
    return null
  }

  return {
    temperature: reading.temperature,
    humidity: reading.humidity ?? null,
    timestamp: reading.createdAt,
    source: reading.source
  }
}

export const createSensorStore = (database) => {
  if (!database) {
    throw new Error(
      'createSensorStore requires a database instance. ' +
        'Pass a Drizzle db via createSensorStore(db).'
    )
  }

  const save = async (temperature, source, humidity = null) => {
    const createdAt = new Date().toISOString()

    await database
      .insert(sensorReadings)
      .values({
        temperature,
        humidity,
        source,
        createdAt
      })

    return {
      temperature,
      humidity,
      timestamp: createdAt,
      source
    }
  }

  const getLatest = async () => {
    const [latestReading] = await database
      .select()
      .from(sensorReadings)
      .orderBy(desc(sensorReadings.id))
      .limit(1)

    return toReadingPayload(latestReading)
  }

  return {
    save,
    getLatest
  }
}
