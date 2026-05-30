import { describe, expect, it } from 'vitest'
// Extend Zod with .openapi() before importing schemas that use it
import '@hono/zod-openapi'
import {
  AlertLevelSchema,
  AlertLogSchema,
  AlertsQuerySchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  SensorReadingSchema,
  SensorReadingsQuerySchema,
  StatusOkSchema,
  TemperatureBodySchema
} from '../../src/schemas/sensor.js'

describe('TemperatureBodySchema', () => {
  it('accepts a valid temperature number', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: 37.5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.temperature).toBe(37.5)
    }
  })

  it('accepts optional humidity percentage', () => {
    const result = TemperatureBodySchema.safeParse({
      temperature: 32.5,
      humidity: 68.0
    })
    expect(result.success).toBe(true)
  })

  it('rejects humidity outside 0–100%', () => {
    expect(
      TemperatureBodySchema.safeParse({ temperature: 32.5, humidity: 101 })
        .success
    ).toBe(false)
    expect(
      TemperatureBodySchema.safeParse({ temperature: 32.5, humidity: -1 })
        .success
    ).toBe(false)
  })

  it('accepts zero as a valid temperature', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts negative temperatures', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: -10 })
    expect(result.success).toBe(true)
  })

  it('rejects missing temperature field', () => {
    const result = TemperatureBodySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects string temperature', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: 'hot' })
    expect(result.success).toBe(false)
  })

  it('rejects null temperature', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: null })
    expect(result.success).toBe(false)
  })

  it('rejects undefined temperature', () => {
    const result = TemperatureBodySchema.safeParse({ temperature: undefined })
    expect(result.success).toBe(false)
  })
})

describe('AlertLevelSchema', () => {
  const validAlert = {
    level: 'danger',
    message: 'Extreme Heat Warning - Find a Cool Space Now'
  }

  it('accepts a valid alert object', () => {
    const result = AlertLevelSchema.safeParse(validAlert)
    expect(result.success).toBe(true)
  })

  it('accepts all four level values', () => {
    for (const level of ['safe', 'caution', 'danger', 'extreme']) {
      const result = AlertLevelSchema.safeParse({ level, message: 'test' })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid level value', () => {
    const result = AlertLevelSchema.safeParse({
      level: 'critical',
      message: 'test'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing level', () => {
    const result = AlertLevelSchema.safeParse({ message: 'test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing message', () => {
    const result = AlertLevelSchema.safeParse({ level: 'safe' })
    expect(result.success).toBe(false)
  })
})

describe('SensorReadingSchema', () => {
  const validReading = {
    temperature: 35.2,
    humidity: 68.0,
    humidex: 46.1,
    timestamp: '2026-05-26T14:30:00.000Z',
    alert: {
      level: 'danger',
      message: 'Extreme Heat Warning - Find a Cool Space Now'
    }
  }

  it('accepts a valid sensor reading', () => {
    const result = SensorReadingSchema.safeParse(validReading)
    expect(result.success).toBe(true)
  })

  it('rejects missing alert', () => {
    const { alert, ...noAlert } = validReading
    const result = SensorReadingSchema.safeParse(noAlert)
    expect(result.success).toBe(false)
  })
})

describe('EmptySensorReadingSchema', () => {
  const emptyReading = {
    temperature: null,
    humidity: null,
    humidex: null,
    timestamp: null,
    alert: null
  }

  it('accepts all-null empty reading', () => {
    const result = EmptySensorReadingSchema.safeParse(emptyReading)
    expect(result.success).toBe(true)
  })
})

describe('StatusOkSchema', () => {
  it('accepts { status: "ok" }', () => {
    const result = StatusOkSchema.safeParse({ status: 'ok' })
    expect(result.success).toBe(true)
  })

  it('rejects other status values', () => {
    const result = StatusOkSchema.safeParse({ status: 'error' })
    expect(result.success).toBe(false)
  })

  it('rejects missing status', () => {
    const result = StatusOkSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('AlertLogSchema', () => {
  it('accepts valid alert log rows', () => {
    const result = AlertLogSchema.safeParse({
      id: 1,
      timestamp: '2026-05-26T14:30:00.000Z',
      temperature: 41,
      humidex: 46.1,
      humidity: 68,
      alertLevel: 'danger',
      lat: null,
      lng: null,
      zone: 'zone-a'
    })

    expect(result.success).toBe(true)
  })
})

describe('AlertsQuerySchema', () => {
  it('accepts optional query values', () => {
    const result = AlertsQuerySchema.safeParse({
      limit: '50',
      from: '2026-05-26',
      to: '26/05/2026',
      level: 'danger',
      zone: 'zone-a'
    })

    expect(result.success).toBe(true)
  })
})

describe('SensorReadingsQuerySchema', () => {
  it('accepts optional sensor log query values', () => {
    const result = SensorReadingsQuerySchema.safeParse({
      limit: '100',
      from: '2026-05-26',
      to: '26/05/2026'
    })

    expect(result.success).toBe(true)
  })
})

describe('ErrorResponseSchema', () => {
  it('accepts valid error response', () => {
    const result = ErrorResponseSchema.safeParse({
      error: 'Something went wrong'
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing error field', () => {
    const result = ErrorResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
