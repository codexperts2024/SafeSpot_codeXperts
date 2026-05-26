import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { registerSensorRoutes } from './routes/sensor.js'
import { createSensorStore } from './sensor-store.js'

export const createApp = ({ sensorStore = createSensorStore() } = {}) => {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        const firstIssue = result.error.issues[0]
        const field = firstIssue?.path?.[0] ?? 'unknown'
        return c.json({ error: `Missing or invalid field: ${field}` }, 400)
      }
    }
  })

  app.use('*', cors())

  app.get('/', (c) => c.json({ status: 'ok' }))
  app.get('/health', (c) => c.json({ status: 'ok' }))

  registerSensorRoutes(app, sensorStore)

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'SafeSpot Toronto — Sensor API',
      version: '1.0.0',
      description:
        'Real-time temperature sensor API for SafeSpot Toronto. Receives temperature data ' +
        'from a Raspberry Pi sensor, stores readings in SQLite, evaluates danger levels ' +
        'based on Health Canada and Toronto Public Health guidelines, and provides ' +
        'manual override for testing.',
      contact: {
        name: 'Team codeXperts',
        url: 'https://github.com/codexperts2024/SafeSpot_codeXperts'
      },
      license: { name: 'MIT' }
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Local development server' }
    ],
    tags: [{ name: 'Sensor Data', description: 'Temperature sensor endpoints' }]
  })

  app.get(
    '/docs',
    Scalar({
      url: '/openapi.json',
      pageTitle: 'SafeSpot Toronto — Sensor API Docs'
    })
  )

  return app
}
