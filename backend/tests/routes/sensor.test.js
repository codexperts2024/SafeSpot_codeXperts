import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { alertLogs } from '../../src/schema.js'
import { createMockStore } from '../helpers/mock-sensor-store.js'
import { createTestDatabase } from '../helpers/test-database.js'

describe('Sensor Routes', () => {
  describe('POST /api/sensor-data', () => {
    it('returns 200 with status ok for valid temperature', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 25.5 })
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ status: 'ok' })
    })

    it('saves the reading with source "sensor"', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      await app.request('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 30.0 })
      })

      expect(store.getLatest().source).toBe('sensor')
      expect(store.getLatest().temperature).toBe(30.0)
      expect(store.getLatest().humidity).toBeNull()
    })

    it('accepts and stores humidity from sensor payloads', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 32.5, humidity: 68.0 })
      })

      expect(res.status).toBe(200)
      expect(store.getLatest()).toMatchObject({
        temperature: 32.5,
        humidity: 68.0,
        source: 'sensor'
      })
    })

    it('returns 400 when temperature is missing', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
    })

    it('returns 400 when temperature is a string', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 'hot' })
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/sensor-latest', () => {
    it('returns empty reading when no data exists', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-latest')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({
        temperature: null,
        humidity: null,
        humidex: null,
        timestamp: null,
        source: null,
        alert: null
      })
    })

    it('returns the latest reading with alert metadata', async () => {
      const store = createMockStore()
      store.save(37.5, 'sensor')
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-latest')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.temperature).toBe(37.5)
      expect(body.source).toBe('sensor')
      expect(body.humidity).toBeNull()
      expect(body.humidex).toBe(37.5)
      expect(body.alert.level).toBe('caution')
    })

    it('returns humidity, humidex, and humidex-based alert metadata', async () => {
      const store = createMockStore()
      store.save(32.5, 'sensor', 68.0)
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-latest')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.temperature).toBe(32.5)
      expect(body.humidity).toBe(68.0)
      expect(body.humidex).toBe(46.1)
      expect(body.alert).toEqual({
        level: 'extreme',
        message: 'Extreme Danger - Seek cooling immediately'
      })
    })

    it('returns safe alert for temperature below 30', async () => {
      const store = createMockStore()
      store.save(22.0, 'sensor')
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-latest')
      const body = await res.json()

      expect(body.alert.level).toBe('safe')
    })

    it('includes timestamp in the response', async () => {
      const store = createMockStore()
      store.save(25.0, 'sensor')
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-latest')
      const body = await res.json()

      expect(typeof body.timestamp).toBe('string')
    })
  })

  describe('POST /api/sensor-override', () => {
    it('returns 200 with overridden status', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 31.0 })
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ status: 'overridden', temperature: 31.0 })
    })

    it('saves the reading with source "override"', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      await app.request('/api/sensor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 42.0 })
      })

      expect(store.getLatest().source).toBe('override')
      expect(store.getLatest().temperature).toBe(42.0)
    })

    it('returns 400 when temperature is missing', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
    })

    it('returns 400 when temperature is not a number', async () => {
      const store = createMockStore()
      const app = createApp({ sensorStore: store })

      const res = await app.request('/api/sensor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: [1, 2] })
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/logs/sensor', () => {
    it('returns newest-first sensor reading rows', async () => {
      const db = createTestDatabase()
      await db.rows.push({
        id: 1,
        createdAt: '2026-05-29T08:00:00.000Z',
        temperature: 25,
        humidity: null,
        humidex: null,
        source: 'sensor'
      })
      await db.rows.push({
        id: 2,
        createdAt: '2026-05-29T09:00:00.000Z',
        temperature: 31,
        humidity: 50,
        humidex: 37.6,
        source: 'sensor'
      })

      const app = createApp({ db })
      const res = await app.request('/api/logs/sensor?limit=100')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0]).toMatchObject({
        temperature: 31,
        humidex: 37.6,
        timestamp: '2026-05-29T09:00:00.000Z'
      })
    })

    it('accepts ISO datetime date filters from existing frontend inputs', async () => {
      const db = createTestDatabase()
      await db.rows.push({
        id: 1,
        createdAt: '2026-05-29T08:00:00.000Z',
        temperature: 25,
        humidity: null,
        humidex: null,
        source: 'sensor'
      })

      const app = createApp({ db })
      const res = await app.request(
        '/api/logs/sensor?from=2026-05-29T00:00:00.000Z&to=2026-05-29T23:59:59.999Z'
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
    })

    it('returns 400 for incomplete dates', async () => {
      const app = createApp({ db: createTestDatabase() })

      const res = await app.request('/api/logs/sensor?from=2026-05')

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/alerts', () => {
    it('returns newest-first alert rows with a 24-hour default window', async () => {
      vi.useFakeTimers()
      try {
        const now = new Date('2026-05-29T12:00:00.000Z')
        vi.setSystemTime(now)

        const db = createTestDatabase()
        await db.insert(alertLogs).values({
          timestamp: '2026-05-27T10:00:00.000Z',
          temperature: 31,
          humidex: 37.6,
          humidity: 50,
          alertLevel: 'caution',
          zone: 'old-zone'
        })
        await db.insert(alertLogs).values({
          timestamp: '2026-05-29T11:00:00.000Z',
          temperature: 41,
          humidex: 46.1,
          humidity: 68,
          alertLevel: 'danger',
          zone: 'recent-zone'
        })

        const app = createApp({ db })
        const res = await app.request('/api/alerts')

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveLength(1)
        expect(body[0].zone).toBe('recent-zone')
      } finally {
        vi.useRealTimers()
      }
    })

    it('accepts DD-MM-YYYY and DD/MM/YYYY date filters', async () => {
      const db = createTestDatabase()
      await db.insert(alertLogs).values({
        timestamp: '2026-05-29T09:00:00.000Z',
        temperature: 41,
        humidex: 46.1,
        humidity: 68,
        alertLevel: 'danger',
        zone: 'zone-a'
      })

      const app = createApp({ db })
      const res = await app.request('/api/alerts?from=29-05-2026&to=29/05/2026')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].alertLevel).toBe('danger')
    })

    it('returns 400 for incomplete or invalid dates', async () => {
      const app = createApp({ db: createTestDatabase() })

      const res = await app.request('/api/alerts?from=2026-05')

      expect(res.status).toBe(400)
    })

    it('accepts ISO datetime filters while still requiring day-month-year', async () => {
      const db = createTestDatabase()
      await db.insert(alertLogs).values({
        timestamp: '2026-05-29T09:00:00.000Z',
        temperature: 41,
        humidex: 46.1,
        humidity: 68,
        alertLevel: 'danger',
        zone: 'zone-a'
      })

      const app = createApp({ db })
      const res = await app.request(
        '/api/alerts?from=2026-05-29T00:00:00.000Z&to=2026-05-29T23:59:59.999Z'
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
    })

    it('respects limit, level, and zone filters', async () => {
      const db = createTestDatabase()
      await db.insert(alertLogs).values({
        timestamp: '2026-05-29T08:00:00.000Z',
        temperature: 41,
        humidex: 46.1,
        humidity: 68,
        alertLevel: 'danger',
        zone: 'zone-a'
      })
      await db.insert(alertLogs).values({
        timestamp: '2026-05-29T09:00:00.000Z',
        temperature: 47,
        humidex: 50.0,
        humidity: 60,
        alertLevel: 'extreme',
        zone: 'zone-a'
      })

      const app = createApp({ db })
      const res = await app.request(
        '/api/alerts?limit=100&level=extreme&zone=zone-a'
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].alertLevel).toBe('extreme')
    })

    it('aliases /api/logs/alerts', async () => {
      const db = createTestDatabase()
      await db.insert(alertLogs).values({
        timestamp: '2026-05-29T09:00:00.000Z',
        temperature: 47,
        humidex: 50.0,
        humidity: 60,
        alertLevel: 'extreme',
        zone: 'zone-a'
      })

      const app = createApp({ db })
      const res = await app.request('/api/logs/alerts')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
    })
  })
})
