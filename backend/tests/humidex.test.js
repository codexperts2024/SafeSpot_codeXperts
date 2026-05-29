import { describe, expect, it } from 'vitest'
import { calculateHumidex } from '../src/humidex.js'

describe('calculateHumidex', () => {
  it('returns null when humidity is unavailable', () => {
    expect(calculateHumidex(32.5, null)).toBeNull()
    expect(calculateHumidex(32.5, undefined)).toBeNull()
  })

  it('calculates humidex from temperature and relative humidity', () => {
    expect(calculateHumidex(32.5, 68.0)).toBe(46.1)
  })

  it('rounds humidex to one decimal place', () => {
    expect(calculateHumidex(30, 50)).toBe(37.6)
  })
})
