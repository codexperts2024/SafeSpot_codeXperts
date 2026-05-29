import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import { getAlertLevel } from '../alerts.js'
import { calculateHumidex } from '../humidex.js'
import {
  AlertLogSchema,
  AlertsQuerySchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  OverrideResponseSchema,
  SensorLogsQuerySchema,
  SensorReadingSchema,
  StatusOkSchema,
  TemperatureBodySchema
} from '../schemas/sensor.js'

const createReadingPayload = (reading) => {
  const calculatedHumidex = calculateHumidex(
    reading.temperature,
    reading.humidity
  )
  const humidex = reading.humidex ?? calculatedHumidex ?? reading.temperature

  return {
    ...reading,
    humidex,
    alert: getAlertLevel(humidex)
  }
}

const EMPTY_READING = {
  temperature: null,
  humidity: null,
  humidex: null,
  timestamp: null,
  source: null,
  alert: null
}

const DEFAULT_ALERT_LIMIT = 50
const DEFAULT_SENSOR_LOG_LIMIT = 100

const parseCalendarDate = (value, { endOfDay = false } = {}) => {
  if (!value || typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  let year
  let month
  let day

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    ;[year, month, day] = trimmed.split('-').map(Number)
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    ;[day, month, year] = trimmed.split('-').map(Number)
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    ;[day, month, year] = trimmed.split('/').map(Number)
  } else {
    return null
  }

  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999)
  } else {
    date.setUTCHours(0, 0, 0, 0)
  }

  return date
}

const parseAlertsQuery = (query) => {
  const limitValue = query.limit
    ? Number.parseInt(query.limit, 10)
    : DEFAULT_ALERT_LIMIT

  if (Number.isNaN(limitValue) || limitValue <= 0) {
    return { error: 'Invalid limit' }
  }

  const limit = Math.min(limitValue, DEFAULT_ALERT_LIMIT)
  const from = query.from
    ? parseCalendarDate(query.from, { endOfDay: false })
    : null
  const to = query.to
    ? parseCalendarDate(query.to, { endOfDay: true })
    : null

  if ((query.from && !from) || (query.to && !to)) {
    return { error: 'Invalid date value' }
  }

  const now = new Date()
  const effectiveTo = to ?? now
  const effectiveFrom =
    from ?? new Date(effectiveTo.getTime() - 24 * 60 * 60 * 1000)

  return {
    limit,
    from: effectiveFrom,
    to: effectiveTo,
    level: query.level,
    zone: query.zone
  }
}

const parseSensorLogsQuery = (query) => {
  const limitValue = query.limit
    ? Number.parseInt(query.limit, 10)
    : DEFAULT_SENSOR_LOG_LIMIT

  if (Number.isNaN(limitValue) || limitValue <= 0) {
    return { error: 'Invalid limit' }
  }

  const from = query.from
    ? parseCalendarDate(query.from, { endOfDay: false })
    : null
  const to = query.to
    ? parseCalendarDate(query.to, { endOfDay: true })
    : null

  if ((query.from && !from) || (query.to && !to)) {
    return { error: 'Invalid date value' }
  }

  return {
    limit: Math.min(limitValue, DEFAULT_SENSOR_LOG_LIMIT),
    from,
    to
  }
}

const temperatureRequestBody = {
  content: {
    'application/json': { schema: TemperatureBodySchema }
  }
}

const badRequestResponse = {
  description: 'Missing or invalid temperature value',
  content: {
    'application/json': { schema: ErrorResponseSchema }
  }
}

const sensorDataRoute = createRoute({
  method: 'post',
  path: '/api/sensor-data',
  tags: ['Sensor Data'],
  summary: 'Receive temperature from Raspberry Pi',
  description:
    'Stores a new temperature reading from the Raspberry Pi sensor,' +
    ' evaluates the alert level based on danger thresholds, and stores' +
    ' the reading in PostgreSQL with `source: sensor`.',
  operationId: 'postSensorData',
  request: {
    body: temperatureRequestBody
  },
  responses: {
    200: {
      description: 'Reading received and stored successfully',
      content: {
        'application/json': { schema: StatusOkSchema }
      }
    },
    400: badRequestResponse
  }
})

const sensorLatestRoute = createRoute({
  method: 'get',
  path: '/api/sensor-latest',
  tags: ['Sensor Data'],
  summary: 'Get the latest temperature reading',
  description:
    'Returns the most recent temperature reading from PostgreSQL with' +
    ' its alert level, timestamp, and source. Used by the frontend' +
    ' to display live data on the dashboard.',
  operationId: 'getSensorLatest',
  responses: {
    200: {
      description: 'Latest reading retrieved successfully',
      content: {
        'application/json': {
          schema: z.union([SensorReadingSchema, EmptySensorReadingSchema])
        }
      }
    }
  }
})

const sensorOverrideRoute = createRoute({
  method: 'post',
  path: '/api/sensor-override',
  tags: ['Sensor Data'],
  summary: 'Manual temperature input for testing',
  description:
    'Allows testing without the physical sensor. Simulates a' +
    ' temperature reading by manually setting a value, useful for' +
    ' testing alert levels and frontend behavior. Stores the reading' +
    ' in PostgreSQL with `source: override`.',
  operationId: 'postSensorOverride',
  request: {
    body: temperatureRequestBody
  },
  responses: {
    200: {
      description: 'Override applied successfully',
      content: {
        'application/json': { schema: OverrideResponseSchema }
      }
    },
    400: badRequestResponse
  }
})

const alertsRoute = createRoute({
  method: 'get',
  path: '/api/alerts',
  tags: ['Alerts'],
  summary: 'Get recorded alert logs',
  description:
    'Returns newest-first alert log rows from PostgreSQL. Supports optional date, level, zone, and limit filters.',
  operationId: 'getAlerts',
  request: {
    query: AlertsQuerySchema
  },
  responses: {
    200: {
      description: 'Alert logs retrieved successfully',
      content: {
        'application/json': {
          schema: z.array(AlertLogSchema)
        }
      }
    },
    400: badRequestResponse
  }
})

const sensorLogsRoute = createRoute({
  method: 'get',
  path: '/api/logs/sensor',
  tags: ['Sensor Data'],
  summary: 'Get recorded sensor readings',
  description:
    'Returns newest-first sensor readings from PostgreSQL. Supports optional date and limit filters.',
  operationId: 'getSensorLogs',
  request: {
    query: SensorLogsQuerySchema
  },
  responses: {
    200: {
      description: 'Sensor readings retrieved successfully',
      content: {
        'application/json': {
          schema: z.array(SensorReadingSchema.omit({ alert: true }))
        }
      }
    },
    400: badRequestResponse
  }
})

export const registerSensorRoutes = (app, sensorStore, alertStore) => {
  app.openapi(sensorDataRoute, async (c) => {
    const { humidity, lat, lng, temperature, zone } = c.req.valid('json')
    await sensorStore.save(temperature, 'sensor', humidity ?? null, {
      lat,
      lng,
      zone
    })
    return c.json({ status: 'ok' }, 200)
  })

  app.openapi(sensorLatestRoute, async (c) => {
    const latestReading = await sensorStore.getLatest()

    if (!latestReading) {
      return c.json(EMPTY_READING, 200)
    }

    return c.json(createReadingPayload(latestReading), 200)
  })

  app.openapi(sensorOverrideRoute, async (c) => {
    const { humidity, lat, lng, temperature, zone } = c.req.valid('json')
    await sensorStore.save(temperature, 'override', humidity ?? null, {
      lat,
      lng,
      zone
    })
    return c.json({ status: 'overridden', temperature }, 200)
  })

  app.openapi(sensorLogsRoute, async (c) => {
    const parsed = parseSensorLogsQuery(c.req.valid('query'))

    if (parsed.error) {
      return c.json({ error: parsed.error }, 400)
    }

    const readings = await sensorStore.listReadings(parsed)
    return c.json(readings, 200)
  })

  const handleAlertsRequest = async (c, query = {}) => {
    const parsed = parseAlertsQuery(query)

    if (parsed.error) {
      return c.json({ error: parsed.error }, 400)
    }

    const alerts = await alertStore.listAlerts(parsed)
    return c.json(alerts, 200)
  }

  app.openapi(alertsRoute, async (c) =>
    handleAlertsRequest(c, c.req.valid('query'))
  )
  app.get('/api/logs/alerts', async (c) => {
    const query = Object.fromEntries(new URL(c.req.url).searchParams.entries())
    return handleAlertsRequest(c, query)
  })
}
