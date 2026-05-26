import { desc } from 'drizzle-orm'
import { db } from './db.js'
import { sensorReadings } from './schema.js'

const toReadingPayload = (reading) => {
  if (!reading) {
    return null
  }

  return {
    temperature: reading.temperature,
    timestamp: reading.createdAt,
    source: reading.source
  }
}

export const createSensorStore = (database = db) => {
  const save = (temperature, source) => {
    const createdAt = new Date().toISOString()

    database
      .insert(sensorReadings)
      .values({
        temperature,
        source,
        createdAt
      })
      .run()

    return {
      temperature,
      timestamp: createdAt,
      source
    }
  }

  const getLatest = () => {
    const latestReading = database
      .select()
      .from(sensorReadings)
      .orderBy(desc(sensorReadings.id))
      .limit(1)
      .get()

    return toReadingPayload(latestReading)
  }

  return {
    save,
    getLatest
  }
}
