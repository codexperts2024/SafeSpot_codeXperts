import { beforeEach, describe, expect, it } from 'vitest'
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
    it('saves a sensor reading and returns a payload', async () => {
      const result = await store.save(25.5, 'sensor')

      expect(result).toEqual({
        temperature: 25.5,
        humidity: null,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('saves humidity when provided', async () => {
      const result = await store.save(32.5, 'sensor', 68.0)

      expect(result).toEqual({
        temperature: 32.5,
        humidity: 68.0,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('returns a valid ISO 8601 timestamp', async () => {
      const result = await store.save(30.0, 'override')

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('persists the reading to the database', async () => {
      await store.save(28.0, 'sensor')

      const rows = db.rows
      expect(rows).toHaveLength(1)
      expect(rows[0].temperature).toBe(28.0)
      expect(rows[0].humidity).toBeNull()
      expect(rows[0].source).toBe('sensor')
    })

    it('saves multiple readings with incrementing IDs', async () => {
      await store.save(20.0, 'sensor')
      await store.save(30.0, 'override')

      const rows = db.rows
      expect(rows).toHaveLength(2)
      expect(rows[0].temperature).toBe(20.0)
      expect(rows[1].temperature).toBe(30.0)
    })

    it('saves with override source', async () => {
      await store.save(42.0, 'override')

      const rows = db.rows
      expect(rows[0].source).toBe('override')
    })
  })

  describe('getLatest', () => {
    it('returns null when no readings exist', async () => {
      await expect(store.getLatest()).resolves.toBeNull()
    })

    it('returns the most recent reading', async () => {
      await store.save(20.0, 'sensor')
      await store.save(35.0, 'override')

      const latest = await store.getLatest()
      expect(latest.temperature).toBe(35.0)
      expect(latest.source).toBe('override')
    })

    it('returns a payload with correct structure', async () => {
      await store.save(25.0, 'sensor', 55.0)

      const latest = await store.getLatest()
      expect(latest).toEqual({
        temperature: 25.0,
        humidity: 55.0,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('always returns the last inserted reading', async () => {
      await store.save(10.0, 'sensor')
      await store.save(20.0, 'sensor')
      await store.save(30.0, 'sensor')

      expect((await store.getLatest()).temperature).toBe(30.0)
    })
  })

  describe('integration: save then getLatest', () => {
    it('getLatest reflects the most recent save', async () => {
      await store.save(22.0, 'sensor')
      expect((await store.getLatest()).temperature).toBe(22.0)

      await store.save(44.0, 'override')
      expect((await store.getLatest()).temperature).toBe(44.0)
    })
  })
})
