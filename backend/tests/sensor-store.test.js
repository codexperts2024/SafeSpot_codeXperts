import { beforeEach, describe, expect, it } from 'vitest'
import { sensorReadings } from '../src/schema.js'
import { createSensorStore } from '../src/sensor-store.js'
import { createTestDatabase } from './helpers/test-database.js'

describe('createSensorStore', () => {
  let db
  let store

  beforeEach(() => {
    db = createTestDatabase()
    store = createSensorStore(db)
  })

  describe('save', () => {
    it('saves a sensor reading and returns a payload', () => {
      const result = store.save(25.5, 'sensor')

      expect(result).toEqual({
        temperature: 25.5,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('returns a valid ISO 8601 timestamp', () => {
      const result = store.save(30.0, 'override')

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('persists the reading to the database', () => {
      store.save(28.0, 'sensor')

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(1)
      expect(rows[0].temperature).toBe(28.0)
      expect(rows[0].source).toBe('sensor')
    })

    it('saves multiple readings with incrementing IDs', () => {
      store.save(20.0, 'sensor')
      store.save(30.0, 'override')

      const rows = db.select().from(sensorReadings).all()
      expect(rows).toHaveLength(2)
      expect(rows[0].temperature).toBe(20.0)
      expect(rows[1].temperature).toBe(30.0)
    })

    it('saves with override source', () => {
      store.save(42.0, 'override')

      const rows = db.select().from(sensorReadings).all()
      expect(rows[0].source).toBe('override')
    })
  })

  describe('getLatest', () => {
    it('returns null when no readings exist', () => {
      expect(store.getLatest()).toBeNull()
    })

    it('returns the most recent reading', () => {
      store.save(20.0, 'sensor')
      store.save(35.0, 'override')

      const latest = store.getLatest()
      expect(latest.temperature).toBe(35.0)
      expect(latest.source).toBe('override')
    })

    it('returns a payload with correct structure', () => {
      store.save(25.0, 'sensor')

      const latest = store.getLatest()
      expect(latest).toEqual({
        temperature: 25.0,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('always returns the last inserted reading', () => {
      store.save(10.0, 'sensor')
      store.save(20.0, 'sensor')
      store.save(30.0, 'sensor')

      expect(store.getLatest().temperature).toBe(30.0)
    })
  })

  describe('integration: save then getLatest', () => {
    it('getLatest reflects the most recent save', () => {
      store.save(22.0, 'sensor')
      expect(store.getLatest().temperature).toBe(22.0)

      store.save(44.0, 'override')
      expect(store.getLatest().temperature).toBe(44.0)
    })
  })
})
