import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import { getAlertLevel } from '../alerts.js'
import {
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  OverrideResponseSchema,
  SensorReadingSchema,
  StatusOkSchema,
  TemperatureBodySchema
} from '../schemas/sensor.js'

const createReadingPayload = (reading) => ({
  ...reading,
  alert: getAlertLevel(reading.temperature)
})

const EMPTY_READING = {
  temperature: null,
  timestamp: null,
  source: null,
  alert: null
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
    ' the reading in SQLite with `source: sensor`.',
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
    'Returns the most recent temperature reading from SQLite with' +
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
    ' in SQLite with `source: override`.',
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

export const registerSensorRoutes = (app, sensorStore) => {
  app.openapi(sensorDataRoute, async (c) => {
    const { temperature } = c.req.valid('json')
    sensorStore.save(temperature, 'sensor')
    return c.json({ status: 'ok' }, 200)
  })

  app.openapi(sensorLatestRoute, (c) => {
    const latestReading = sensorStore.getLatest()

    if (!latestReading) {
      return c.json(EMPTY_READING, 200)
    }

    return c.json(createReadingPayload(latestReading), 200)
  })

  app.openapi(sensorOverrideRoute, async (c) => {
    const { temperature } = c.req.valid('json')
    sensorStore.save(temperature, 'override')
    return c.json({ status: 'overridden', temperature }, 200)
  })
}
