import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createAlertStore } from './alerts-store.js'
import { registerSensorRoutes } from './routes/sensor.js'
import { createSensorStore } from './sensor-store.js'

export const createApp = ({ sensorStore, alertStore, db: database } = {}) => {
  const alerts = alertStore ?? createAlertStore(database)
  const store =
    sensorStore ?? createSensorStore(database, { alertStore: alerts })
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
  app.use('*', logger())

  const healthHandler = (c) => c.json({ status: 'ok' })
  app.get('/', healthHandler)
  app.get('/health', healthHandler)

  registerSensorRoutes(app, store, alerts)

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'SafeSpot Toronto — Sensor API',
      version: '1.0.0',
      description:
        'Real-time temperature sensor API for SafeSpot Toronto. Receives temperature data ' +
        'from a Raspberry Pi sensor, stores readings in PostgreSQL, evaluates danger levels ' +
        'based on Health Canada and Toronto Public Health guidelines, and returns the latest ' +
        'or historical sensor readings.',
      contact: {
        name: 'Team codeXperts',
        url: 'https://github.com/codexperts2024/SafeSpot_codeXperts'
      },
      license: { name: 'MIT' }
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Local development server' }
    ],
    tags: [
      { name: 'Sensor Data', description: 'Temperature sensor endpoints' },
      { name: 'Alerts', description: 'Alert history endpoints' }
    ]
  })

  app.get(
    '/docs',
    swaggerUI({
      url: '/openapi.json',
      title: 'SafeSpot Toronto — Sensor API Docs'
    })
  )

  return app
}
