import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createMockStore } from '../helpers/mock-sensor-store.js'

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
      expect(body.alert).toEqual({
        level: 'danger',
        message: 'Extreme Heat Warning - Find a Cool Space Now'
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
})
