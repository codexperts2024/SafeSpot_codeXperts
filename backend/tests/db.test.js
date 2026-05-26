import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { sensorReadings } from '../src/schema.js'

// We recreate the db module functions inline to test them in isolation
// since the real db.js imports create a file-based database.

const createTestSqlite = () => new Database(':memory:')

const initializeDatabase = (sqlite) => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
}

const seedMockData = (database, sqlite) => {
  const rowCount = sqlite
    .prepare('SELECT COUNT(*) AS count FROM sensor_readings')
    .get().count
  if (rowCount > 0) return 0

  const mockReadings = [
    { temperature: 21.3, source: 'sensor' },
    { temperature: 23.7, source: 'sensor' },
    { temperature: 40.5, source: 'sensor' }
  ]

  const now = Date.now()
  const readings = mockReadings.map((entry, i) => ({
    ...entry,
    createdAt: new Date(
      now - (mockReadings.length - 1 - i) * 45 * 60 * 1000
    ).toISOString()
  }))

  database.insert(sensorReadings).values(readings).run()
  return readings.length
}

describe('Database initialization', () => {
  let sqlite
  let db

  beforeEach(() => {
    sqlite = createTestSqlite()
    db = drizzle(sqlite)
  })

  describe('initializeDatabase', () => {
    it('creates the sensor_readings table', () => {
      initializeDatabase(sqlite)

      const tables = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='sensor_readings'"
        )
        .all()
      expect(tables).toHaveLength(1)
    })

    it('does not fail when called twice (idempotent)', () => {
      initializeDatabase(sqlite)
      initializeDatabase(sqlite)

      const tables = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='sensor_readings'"
        )
        .all()
      expect(tables).toHaveLength(1)
    })

    it('creates table with correct columns', () => {
      initializeDatabase(sqlite)

      const info = sqlite.pragma('table_info(sensor_readings)')
      const columns = info.map((col) => col.name)
      expect(columns).toContain('id')
      expect(columns).toContain('temperature')
      expect(columns).toContain('source')
      expect(columns).toContain('created_at')
    })
  })

  describe('seedMockData', () => {
    it('seeds data into an empty table', () => {
      initializeDatabase(sqlite)

      const count = seedMockData(db, sqlite)
      expect(count).toBe(3)

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(3)
    })

    it('does not seed when table already has data', () => {
      initializeDatabase(sqlite)
      seedMockData(db, sqlite)

      const count = seedMockData(db, sqlite)
      expect(count).toBe(0)

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(3)
    })

    it('seeds readings with correct fields', () => {
      initializeDatabase(sqlite)
      seedMockData(db, sqlite)

      const rows = db.select().from(sensorReadings).all()
      for (const row of rows) {
        expect(typeof row.temperature).toBe('number')
        expect(['sensor', 'override']).toContain(row.source)
        expect(typeof row.createdAt).toBe('string')
      }
    })

    it('seeds readings with timestamps in chronological order', () => {
      initializeDatabase(sqlite)
      seedMockData(db, sqlite)

      const rows = db.select().from(sensorReadings).all()
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(rows[i - 1].createdAt).getTime()
        )
      }
    })
  })
})
