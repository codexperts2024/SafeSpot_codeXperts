import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import { getAlertLevel } from '../alerts.js'
import { calculateHumidex } from '../humidex.js'
import {
  AlertLogSchema,
  AlertsQuerySchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  SensorReadingSchema,
  SensorReadingsQuerySchema,
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
const MAX_ALERT_LIMIT = 500
const DEFAULT_SENSOR_READING_LIMIT = 100
const MAX_SENSOR_READING_LIMIT = 500

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

  const limit = Math.min(limitValue, MAX_ALERT_LIMIT)
  const from = query.from
    ? parseCalendarDate(query.from, { endOfDay: false })
    : null
  const to = query.to ? parseCalendarDate(query.to, { endOfDay: true }) : null

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

const parseSensorReadingsQuery = (query) => {
  const limitValue = query.limit
    ? Number.parseInt(query.limit, 10)
    : DEFAULT_SENSOR_READING_LIMIT

  if (Number.isNaN(limitValue) || limitValue <= 0) {
    return { error: 'Invalid limit' }
  }

  const from = query.from
    ? parseCalendarDate(query.from, { endOfDay: false })
    : null
  const to = query.to ? parseCalendarDate(query.to, { endOfDay: true }) : null

  if ((query.from && !from) || (query.to && !to)) {
    return { error: 'Invalid date value' }
  }

  return {
    limit: Math.min(limitValue, MAX_SENSOR_READING_LIMIT),
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

const sensorDataPostRoute = createRoute({
  method: 'post',
  path: '/api/sensors',
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

const sensorDataGetRoute = createRoute({
  method: 'get',
  path: '/api/sensors',
  tags: ['Sensor Data'],
  summary: 'Get sensor readings',
  description:
    'Returns the most recent temperature reading by default. Provide' +
    ' a `limit` query parameter to retrieve newest-first historical readings.' +
    ' Optional `from` and `to` filters are available when listing readings.',
  operationId: 'getSensorData',
  request: {
    query: SensorReadingsQuerySchema
  },
  responses: {
    200: {
      description: 'Sensor reading data retrieved successfully',
      content: {
        'application/json': {
          schema: z.union([
            SensorReadingSchema,
            EmptySensorReadingSchema,
            z.array(SensorReadingSchema)
          ])
        }
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

const alertLogsRoute = createRoute({
  method: 'get',
  path: '/api/logs/alerts',
  tags: ['Alerts'],
  summary: 'Get recorded alert logs (alias)',
  description:
    'Alias for /api/alerts. Returns newest-first alert log rows. Supports optional date, level, zone, and limit filters.',
  operationId: 'getAlertLogs',
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

export const registerSensorRoutes = (app, sensorStore, alertStore) => {
  const handleAlertsRequest = async (c, query = {}) => {
    const parsed = parseAlertsQuery(query)

    if (parsed.error) {
      return c.json({ error: parsed.error }, 400)
    }

    const alerts = await alertStore.listAlerts(parsed)
    return c.json(alerts, 200)
  }

  app.openapi(sensorDataPostRoute, async (c) => {
    const { humidity, lat, lng, temperature, zone } = c.req.valid('json')
    await sensorStore.save(temperature, 'sensor', humidity ?? null, {
      lat,
      lng,
      zone
    })
    return c.json({ status: 'ok' }, 200)
  })

  app.openapi(sensorDataGetRoute, async (c) => {
    const query = c.req.valid('query')
    const shouldListReadings = Boolean(query.limit || query.from || query.to)

    if (shouldListReadings) {
      const parsed = parseSensorReadingsQuery(query)

      if (parsed.error) {
        return c.json({ error: parsed.error }, 400)
      }

      const readings = await sensorStore.listReadings(parsed)
      return c.json(readings.map(createReadingPayload), 200)
    }

    const latestReading = await sensorStore.getLatest()

    if (!latestReading) {
      return c.json(EMPTY_READING, 200)
    }

    return c.json(createReadingPayload(latestReading), 200)
  })

  app.openapi(alertsRoute, async (c) =>
    handleAlertsRequest(c, c.req.valid('query'))
  )

  app.openapi(alertLogsRoute, async (c) =>
    handleAlertsRequest(c, c.req.valid('query'))
  )
}
