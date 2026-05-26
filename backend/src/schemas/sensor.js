import { z } from 'zod'

const AlertLevelSchema = z
  .object({
    level: z.enum(['safe', 'caution', 'danger', 'extreme']).openapi({
      description:
        '- **safe**: < 30°C — No alert\n' +
        '- **caution**: 30–34°C — Mild warning to stay hydrated and cool\n' +
        '- **danger**: 35–39°C — Extreme heat warning to find a cool space now\n' +
        '- **extreme**: ≥ 40°C — Urgent alert to seek cooling immediately',
      example: 'danger'
    }),
    message: z.string().openapi({
      description: 'Human-readable alert message for the UI',
      example: 'Extreme Heat Warning - Find a Cool Space Now'
    })
  })
  .openapi(
    'AlertLevel',
    'Alert level determined by temperature thresholds based on Health Canada and Toronto Public Health guidelines.'
  )

const SensorReadingSchema = z
  .object({
    temperature: z
      .number()
      .openapi({ description: 'Temperature in Celsius', example: 37.5 }),
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
  .openapi('SensorReading', 'Complete temperature reading with alert metadata')

const EmptySensorReadingSchema = z
  .object({
    temperature: z.nullable(z.number()).openapi({ example: null }),
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
    .openapi({ description: 'Temperature in Celsius', example: 37.5 })
})

const StatusOkSchema = z.object({
  status: z.literal('ok')
})

const OverrideResponseSchema = z.object({
  status: z.literal('overridden'),
  temperature: z.number().openapi({ example: 31.0 })
})

export {
  AlertLevelSchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  OverrideResponseSchema,
  SensorReadingSchema,
  StatusOkSchema,
  TemperatureBodySchema
}
