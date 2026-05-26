import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sensorReadings } from './schema.js'

const sqlite = new Database('safespot.db')

export const db = drizzle(sqlite)

export const initializeDatabase = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
}

const MOCK_READINGS = [
  // safe (<30°C)
  { temperature: 21.3, source: 'sensor' },
  { temperature: 23.7, source: 'sensor' },
  { temperature: 25.0, source: 'override' },
  { temperature: 26.4, source: 'sensor' },
  { temperature: 28.1, source: 'sensor' },
  { temperature: 29.5, source: 'override' },
  // caution (30–34°C)
  { temperature: 30.2, source: 'sensor' },
  { temperature: 31.8, source: 'sensor' },
  { temperature: 33.0, source: 'override' },
  { temperature: 34.5, source: 'sensor' },
  // danger (35–39°C)
  { temperature: 35.7, source: 'sensor' },
  { temperature: 36.9, source: 'sensor' },
  { temperature: 38.0, source: 'override' },
  { temperature: 39.2, source: 'sensor' },
  // extreme (≥40°C)
  { temperature: 40.5, source: 'sensor' },
  { temperature: 41.8, source: 'sensor' },
  { temperature: 42.3, source: 'override' },
  { temperature: 43.1, source: 'sensor' },
  // latest — back to caution, simulating a cooling trend
  { temperature: 32.4, source: 'sensor' },
  { temperature: 29.8, source: 'override' }
]

export const seedMockData = () => {
  const rowCount = sqlite
    .prepare('SELECT COUNT(*) AS count FROM sensor_readings')
    .get().count

  if (rowCount > 0) return

  const now = Date.now()
  const readings = MOCK_READINGS.map((entry, i) => ({
    ...entry,
    createdAt: new Date(
      now - (MOCK_READINGS.length - 1 - i) * 45 * 60 * 1000
    ).toISOString()
  }))

  db.insert(sensorReadings).values(readings).run()

  console.log(`Seeded ${readings.length} mock sensor readings`)
}
