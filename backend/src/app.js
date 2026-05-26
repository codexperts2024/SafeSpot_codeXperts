import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { Scalar } from '@scalar/hono-api-reference';
import { getAlertLevel } from './alerts.js';
import { createSensorStore } from './sensor-store.js';

const AlertLevelSchema = z.object({
  level: z
    .enum(['safe', 'caution', 'danger', 'extreme'])
    .openapi({
      description:
        '- **safe**: < 30°C — No alert\n' +
        '- **caution**: 30–34°C — Mild warning to stay hydrated and cool\n' +
        '- **danger**: 35–39°C — Extreme heat warning to find a cool space now\n' +
        '- **extreme**: ≥ 40°C — Urgent alert to seek cooling immediately',
      example: 'danger',
    }),
  message: z.string().openapi({ description: 'Human-readable alert message for the UI', example: 'Extreme Heat Warning - Find a Cool Space Now' }),
}).openapi('AlertLevel', 'Alert level determined by temperature thresholds based on Health Canada and Toronto Public Health guidelines.');

const SensorReadingSchema = z.object({
  temperature: z.number().openapi({ description: 'Temperature in Celsius', example: 37.5 }),
  timestamp: z.string().openapi({ description: 'ISO 8601 timestamp when reading was recorded', example: '2026-05-26T14:30:00.000Z' }),
  source: z.enum(['sensor', 'override']).openapi({ description: 'Whether the reading came from the Raspberry Pi or a manual override', example: 'sensor' }),
  alert: AlertLevelSchema,
}).openapi('SensorReading', 'Complete temperature reading with alert metadata');

const EmptySensorReadingSchema = z.object({
  temperature: z.nullable(z.number()).openapi({ example: null }),
  timestamp: z.nullable(z.string()).openapi({ example: null }),
  source: z.nullable(z.enum(['sensor', 'override'])).openapi({ example: null }),
  alert: z.nullable(AlertLevelSchema).openapi({ example: null }),
}).openapi('EmptySensorReading', 'Empty state returned when no temperature reading has been recorded yet');

const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: 'Missing or invalid field: temperature' }),
}).openapi('ErrorResponse');

const TemperatureBodySchema = z.object({
  temperature: z.number().openapi({ description: 'Temperature in Celsius', example: 37.5 }),
});

const StatusOkSchema = z.object({
  status: z.literal('ok'),
});

const OverrideResponseSchema = z.object({
  status: z.literal('overridden'),
  temperature: z.number().openapi({ example: 31.0 }),
});

const sensorDataRoute = createRoute({
  method: 'post',
  path: '/api/sensor-data',
  tags: ['Sensor Data'],
  summary: 'Receive temperature from Raspberry Pi',
  description:
    'Stores a new temperature reading from the Raspberry Pi sensor, evaluates ' +
    'the alert level based on danger thresholds, and stores the reading in SQLite ' +
    'with `source: sensor`.',
  operationId: 'postSensorData',
  request: {
    body: {
      content: {
        'application/json': { schema: TemperatureBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Reading received and stored successfully',
      content: {
        'application/json': { schema: StatusOkSchema },
      },
    },
    400: {
      description: 'Missing or invalid temperature value',
      content: {
        'application/json': { schema: ErrorResponseSchema },
      },
    },
  },
});

const sensorLatestRoute = createRoute({
  method: 'get',
  path: '/api/sensor-latest',
  tags: ['Sensor Data'],
  summary: 'Get the latest temperature reading',
  description:
    'Returns the most recent temperature reading from SQLite with its alert level, ' +
    'timestamp, and source. Used by the frontend to display live data on the dashboard.',
  operationId: 'getSensorLatest',
  responses: {
    200: {
      description: 'Latest reading retrieved successfully',
      content: {
        'application/json': {
          schema: z.union([SensorReadingSchema, EmptySensorReadingSchema]),
        },
      },
    },
  },
});

const sensorOverrideRoute = createRoute({
  method: 'post',
  path: '/api/sensor-override',
  tags: ['Sensor Data'],
  summary: 'Manual temperature input for testing',
  description:
    'Allows testing without the physical sensor. Simulates a temperature reading ' +
    'by manually setting a value, useful for testing alert levels and frontend behavior. ' +
    'Stores the reading in SQLite with `source: override`.',
  operationId: 'postSensorOverride',
  request: {
    body: {
      content: {
        'application/json': { schema: TemperatureBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Override applied successfully',
      content: {
        'application/json': { schema: OverrideResponseSchema },
      },
    },
    400: {
      description: 'Missing or invalid temperature value',
      content: {
        'application/json': { schema: ErrorResponseSchema },
      },
    },
  },
});

const createReadingPayload = (reading) => ({
  temperature: reading.temperature,
  timestamp: reading.timestamp,
  source: reading.source,
  alert: getAlertLevel(reading.temperature),
});

const createEmptyReadingPayload = () => ({
  temperature: null,
  timestamp: null,
  source: null,
  alert: null,
});

export const createApp = ({ sensorStore = createSensorStore() } = {}) => {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        const field = firstIssue?.path?.[0] ?? 'unknown';
        return c.json({ error: `Missing or invalid field: ${field}` }, 400);
      }
    },
  });

  app.use('*', cors());

  app.get('/', (c) => c.json({ status: 'ok' }));
  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.openapi(sensorDataRoute, async (c) => {
    const { temperature } = c.req.valid('json');
    sensorStore.save(temperature, 'sensor');
    return c.json({ status: 'ok' }, 200);
  });

  app.openapi(sensorLatestRoute, (c) => {
    const latestReading = sensorStore.getLatest();

    if (!latestReading) {
      return c.json(createEmptyReadingPayload(), 200);
    }

    return c.json(createReadingPayload(latestReading), 200);
  });

  app.openapi(sensorOverrideRoute, async (c) => {
    const { temperature } = c.req.valid('json');
    sensorStore.save(temperature, 'override');
    return c.json({ status: 'overridden', temperature }, 200);
  });

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
        url: 'https://github.com/codexperts2024/SafeSpot_codeXperts',
      },
      license: { name: 'MIT' },
    },
    servers: [{ url: 'http://localhost:8000', description: 'Local development server' }],
    tags: [{ name: 'Sensor Data', description: 'Temperature sensor endpoints' }],
  });

  app.get(
    '/docs',
    Scalar({
      url: '/openapi.json',
      pageTitle: 'SafeSpot Toronto — Sensor API Docs',
    }),
  );

  return app;
};
