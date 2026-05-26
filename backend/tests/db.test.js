import { beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db.js'
import { sensorReadings } from '../src/schema.js'

describe('Database initialization', () => {
  let sqlite
  let db
  let instance

  beforeEach(() => {
    instance = createDatabase({ filename: ':memory:' })
    sqlite = instance.sqlite
    db = instance.db
  })

  describe('initializeDatabase', () => {
    it('creates the sensor_readings table', () => {
      instance.initializeDatabase()

      const tables = sqlite
        .prepare(
          'SELECT name FROM sqlite_master' +
            " WHERE type='table' AND name='sensor_readings'"
        )
        .all()
      expect(tables).toHaveLength(1)
    })

    it('does not fail when called twice (idempotent)', () => {
      instance.initializeDatabase()
      instance.initializeDatabase()

      const tables = sqlite
        .prepare(
          'SELECT name FROM sqlite_master' +
            " WHERE type='table' AND name='sensor_readings'"
        )
        .all()
      expect(tables).toHaveLength(1)
    })

    it('creates table with correct columns', () => {
      instance.initializeDatabase()

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
      instance.initializeDatabase()

      const count = instance.seedMockData()
      expect(count).toBe(20)

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(20)
    })

    it('does not seed when table already has data', () => {
      instance.initializeDatabase()
      instance.seedMockData()

      const count = instance.seedMockData()
      expect(count).toBe(0)

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(20)
    })

    it('seeds readings with correct fields', () => {
      instance.initializeDatabase()
      instance.seedMockData()

      const rows = db.select().from(sensorReadings).all()
      for (const row of rows) {
        expect(typeof row.temperature).toBe('number')
        expect(['sensor', 'override']).toContain(row.source)
        expect(typeof row.createdAt).toBe('string')
      }
    })

    it('seeds readings with timestamps in chronological order', () => {
      instance.initializeDatabase()
      instance.seedMockData()

      const rows = db.select().from(sensorReadings).all()
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(rows[i - 1].createdAt).getTime()
        )
      }
    })
  })
})
