import { beforeEach, describe, expect, it, vi } from 'vitest'
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
        humidex: null,
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('saves humidity when provided', async () => {
      const result = await store.save(32.5, 'sensor', 68.0)

      expect(result).toEqual({
        temperature: 32.5,
        humidity: 68.0,
        humidex: 46.1,
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
      expect(rows[0].humidex).toBeNull()
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

    it('logs caution and higher readings to alert logs', async () => {
      await store.save(30.0, 'sensor', 50.0, {
        lat: 43.7,
        lng: -79.4,
        zone: 'downtown'
      })

      expect(db.alertRows).toHaveLength(1)
      expect(db.alertRows[0]).toMatchObject({
        temperature: 30.0,
        humidity: 50.0,
        humidex: 37.6,
        alertLevel: 'caution',
        lat: 43.7,
        lng: -79.4,
        zone: 'downtown'
      })
    })

    it('does not log safe readings to alert logs', async () => {
      await store.save(25.0, 'sensor')

      expect(db.alertRows).toHaveLength(0)
    })

    it('logs alert rows even when a caution reading is rate-limited', async () => {
      vi.useFakeTimers()
      try {
        const start = new Date('2026-05-29T10:00:00.000Z')
        vi.setSystemTime(start)

        await store.save(30.0, 'sensor', 50.0)

        vi.setSystemTime(new Date(start.getTime() + 30 * 1000))
        await store.save(30.0, 'sensor', 50.0)

        expect(db.rows).toHaveLength(1)
        expect(db.alertRows).toHaveLength(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('stores sensor readings only at the safe frequency', async () => {
      vi.useFakeTimers()
      try {
        const start = new Date('2026-05-29T10:00:00.000Z')
        vi.setSystemTime(start)

        await store.save(25.0, 'sensor')

        vi.setSystemTime(new Date(start.getTime() + 4 * 60 * 1000))
        await store.save(25.0, 'sensor')
        expect(db.rows).toHaveLength(1)

        vi.setSystemTime(new Date(start.getTime() + 5 * 60 * 1000))
        await store.save(25.0, 'sensor')
        expect(db.rows).toHaveLength(2)
      } finally {
        vi.useRealTimers()
      }
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
        humidex: expect.any(Number),
        timestamp: expect.any(String),
        source: 'sensor'
      })
    })

    it('always returns the last inserted reading', async () => {
      vi.useFakeTimers()
      try {
        const start = new Date('2026-05-29T10:00:00.000Z')
        vi.setSystemTime(start)

        await store.save(10.0, 'sensor')
        vi.setSystemTime(new Date(start.getTime() + 5 * 60 * 1000))
        await store.save(20.0, 'sensor')
        vi.setSystemTime(new Date(start.getTime() + 10 * 60 * 1000))
        await store.save(30.0, 'sensor')

        expect((await store.getLatest()).temperature).toBe(30.0)
      } finally {
        vi.useRealTimers()
      }
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
