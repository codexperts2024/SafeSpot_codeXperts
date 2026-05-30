import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createMockStore } from './helpers/mock-sensor-store.js'
import { createTestDatabase } from './helpers/test-database.js'

describe('createApp', () => {
  it('creates an app without errors', () => {
    const app = createApp({ sensorStore: createMockStore() })
    expect(app).toBeDefined()
    expect(typeof app.request).toBe('function')
  })

  it('creates an app with a real db-backed sensorStore', () => {
    const db = createTestDatabase()
    const app = createApp({ db })
    expect(app).toBeDefined()
    expect(typeof app.request).toBe('function')
  })

  describe('GET /', () => {
    it('returns 404', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/health')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ status: 'ok' })
    })
  })

  describe('GET /openapi.json', () => {
    it('returns a valid OpenAPI spec', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/openapi.json')
      expect(res.status).toBe(200)
      const spec = await res.json()
      expect(spec.openapi).toBe('3.1.0')
      expect(spec.info.title).toContain('SafeSpot')
      expect(spec.paths).toBeDefined()
    })
  })

  describe('GET /docs', () => {
    it('returns the Swagger UI docs page', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/docs')
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text.toLowerCase()).toContain('swagger')
    })
  })

  describe('CORS', () => {
    it('includes CORS headers in responses', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/', {
        headers: { Origin: 'http://localhost:3000' }
      })
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
    })
  })

  describe('validation error handling', () => {
    it('returns 400 with field name for invalid JSON body', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unknownField: 42 })
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('temperature')
    })

    it('returns 400 for malformed (non-parseable) JSON body', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/api/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json'
      })

      expect(res.status).toBe(400)
    })
  })

  describe('404 for unknown routes', () => {
    it('returns 404 for non-existent endpoint', async () => {
      const app = createApp({ sensorStore: createMockStore() })

      const res = await app.request('/api/nonexistent')
      expect(res.status).toBe(404)
    })
  })
})
