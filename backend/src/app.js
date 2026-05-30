import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createAlertStore } from './alerts-store.js'
import { registerSensorRoutes } from './routes/sensor.js'
import { createSensorStore } from './sensor-store.js'
import { StatusOkSchema } from './schemas/sensor.js'

const postBodyLogger = async (c, next) => {
  if (c.req.method === 'POST') {
    const contentType = c.req.header('content-type') ?? ''
    const bodyText = await c.req.raw.clone().text()
    let body = bodyText

    if (contentType.includes('application/json') && bodyText) {
      try {
        body = JSON.parse(bodyText)
      } catch {
        body = bodyText
      }
    }

    console.log('POST request body:', body)
  }

  await next()
}

export const createApp = ({ sensorStore, alertStore, db: database } = {}) => {
  const alerts =
    alertStore ?? (database ? createAlertStore(database) : undefined)
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

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse()
    }
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  app.use('*', cors())
  app.use('*', logger())
  app.use('*', postBodyLogger)

  const healthRoute = createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Health check',
    responses: {
      200: {
        description: 'Service is running',
        content: { 'application/json': { schema: StatusOkSchema } }
      }
    }
  })

  app.openapi(healthRoute, (c) => c.json({ status: 'ok' }, 200))

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
      { name: 'Health', description: 'Service health check' },
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
