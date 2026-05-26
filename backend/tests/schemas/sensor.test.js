import { describe, expect, it } from 'vitest'
// Extend Zod with .openapi() before importing schemas that use it
import '@hono/zod-openapi'
import {
  AlertLevelSchema,
  EmptySensorReadingSchema,
  ErrorResponseSchema,
  OverrideResponseSchema,
  SensorReadingSchema,
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
    timestamp: '2026-05-26T14:30:00.000Z',
    source: 'sensor',
    alert: {
      level: 'danger',
      message: 'Extreme Heat Warning - Find a Cool Space Now'
    }
  }

  it('accepts a valid sensor reading', () => {
    const result = SensorReadingSchema.safeParse(validReading)
    expect(result.success).toBe(true)
  })

  it('accepts override source', () => {
    const result = SensorReadingSchema.safeParse({
      ...validReading,
      source: 'override'
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid source', () => {
    const result = SensorReadingSchema.safeParse({
      ...validReading,
      source: 'manual'
    })
    expect(result.success).toBe(false)
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
    timestamp: null,
    source: null,
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

describe('OverrideResponseSchema', () => {
  it('accepts valid override response', () => {
    const result = OverrideResponseSchema.safeParse({
      status: 'overridden',
      temperature: 31.0
    })
    expect(result.success).toBe(true)
  })

  it('rejects wrong status', () => {
    const result = OverrideResponseSchema.safeParse({
      status: 'ok',
      temperature: 31.0
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing temperature', () => {
    const result = OverrideResponseSchema.safeParse({ status: 'overridden' })
    expect(result.success).toBe(false)
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
