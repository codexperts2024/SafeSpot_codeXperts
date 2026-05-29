import '@hono/zod-openapi'
import { z } from 'zod'

const AlertLevelSchema = z
  .object({
    level: z.enum(['safe', 'caution', 'danger', 'extreme']).openapi({
      description:
        '- **safe**: < 30°C — No alert\n' +
        '- **caution**: 30–39°C — Mild warning to stay hydrated and cool\n' +
        '- **danger**: 40–45°C — Extreme heat warning to find a cool space now\n' +
        '- **extreme**: > 45°C — Urgent alert to seek cooling immediately',
      example: 'danger'
    }),
    message: z.string().openapi({
      description: 'Human-readable alert message for the UI',
      example: 'Extreme Heat Warning - Find a Cool Space Now'
    })
  })
  .openapi(
    'AlertLevel',
    'Alert level determined by humidex thresholds based on Health Canada and Toronto Public Health guidelines.'
  )

const HumiditySchema = z
  .number()
  .min(0)
  .max(100)
  .openapi({ description: 'Relative humidity percentage', example: 68.0 })

const SensorReadingSchema = z
  .object({
    id: z.number().int().optional(),
    temperature: z
      .number()
      .openapi({ description: 'Temperature in Celsius', example: 37.5 }),
    humidity: z.nullable(HumiditySchema),
    humidex: z
      .nullable(z.number())
      .openapi({ description: 'Calculated humidex in Celsius', example: 41.2 }),
    timestamp: z.string().openapi({
      description: 'ISO 8601 timestamp when reading was recorded',
      example: '2026-05-26T14:30:00.000Z'
    }),
    source: z.enum(['sensor', 'override']).openapi({
      description:
        'Whether the reading came from the Raspberry Pi or a manual override',
      example: 'sensor'
    }),
    alert: AlertLevelSchema
  })
  .openapi('SensorReading', 'Complete sensor reading with alert metadata')

const AlertLogSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    timestamp: z.string().openapi({
      description: 'Timestamp when the alert was recorded',
      example: '2026-05-26T14:30:00.000Z'
    }),
    temperature: z.number().openapi({ example: 37.5 }),
    humidex: z.nullable(z.number()).openapi({ example: 46.1 }),
    humidity: z.nullable(HumiditySchema),
    alertLevel: z.enum(['safe', 'caution', 'danger', 'extreme']).openapi({
      example: 'danger'
    }),
    lat: z.nullable(z.number()).optional(),
    lng: z.nullable(z.number()).optional(),
    zone: z.nullable(z.string()).optional()
  })
  .openapi('AlertLog', 'Alert log entry from the backend alert history')

const EmptySensorReadingSchema = z
  .object({
    temperature: z.nullable(z.number()).openapi({ example: null }),
    humidity: z.nullable(z.number()).openapi({ example: null }),
    humidex: z.nullable(z.number()).openapi({ example: null }),
    timestamp: z.nullable(z.string()).openapi({ example: null }),
    source: z
      .nullable(z.enum(['sensor', 'override']))
      .openapi({ example: null }),
    alert: z.nullable(AlertLevelSchema).openapi({ example: null })
  })
  .openapi(
    'EmptySensorReading',
    'Empty state returned when no temperature reading has been recorded yet'
  )

const ErrorResponseSchema = z
  .object({
    error: z
      .string()
      .openapi({ example: 'Missing or invalid field: temperature' })
  })
  .openapi('ErrorResponse')

const TemperatureBodySchema = z.object({
  temperature: z
    .number()
    .openapi({ description: 'Temperature in Celsius', example: 37.5 }),
  humidity: HumiditySchema.optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  zone: z.string().optional()
})

const StatusOkSchema = z.object({
  status: z.literal('ok')
})

const OverrideResponseSchema = z.object({
  status: z.literal('overridden'),
  temperature: z.number().openapi({ example: 31.0 })
})

const AlertsQuerySchema = z.object({
  limit: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  level: z.enum(['safe', 'caution', 'danger', 'extreme']).optional(),
  zone: z.string().optional()
})

const SensorLogsQuerySchema = z.object({
  limit: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
})

export {
  AlertLevelSchema,
  AlertLogSchema,
  AlertsQuerySchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  OverrideResponseSchema,
  SensorLogsQuerySchema,
  SensorReadingSchema,
  StatusOkSchema,
  TemperatureBodySchema
}
