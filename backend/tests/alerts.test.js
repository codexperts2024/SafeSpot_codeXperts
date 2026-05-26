import { describe, expect, it } from 'vitest'
import { getAlertLevel } from '../src/alerts.js'

describe('getAlertLevel', () => {
  describe('safe level (< 30°C)', () => {
    it('returns safe for 0°C', () => {
      expect(getAlertLevel(0)).toEqual({
        level: 'safe',
        message: 'Temperature is safe'
      })
    })

    it('returns safe for 20°C', () => {
      expect(getAlertLevel(20)).toEqual({
        level: 'safe',
        message: 'Temperature is safe'
      })
    })

    it('returns safe at upper boundary 29.9°C', () => {
      expect(getAlertLevel(29.9).level).toBe('safe')
    })

    it('returns safe for negative temperatures', () => {
      expect(getAlertLevel(-10).level).toBe('safe')
    })
  })

  describe('caution level (30–34°C)', () => {
    it('returns caution at lower boundary 30°C', () => {
      expect(getAlertLevel(30)).toEqual({
        level: 'caution',
        message: 'Heat Caution - Stay hydrated and cool'
      })
    })

    it('returns caution for 32°C', () => {
      expect(getAlertLevel(32).level).toBe('caution')
    })

    it('returns caution at upper boundary 34.9°C', () => {
      expect(getAlertLevel(34.999).level).toBe('caution')
    })
  })

  describe('danger level (35–39°C)', () => {
    it('returns danger at lower boundary 35°C', () => {
      expect(getAlertLevel(35)).toEqual({
        level: 'danger',
        message: 'Extreme Heat Warning - Find a Cool Space Now'
      })
    })

    it('returns danger for 37.5°C', () => {
      expect(getAlertLevel(37.5).level).toBe('danger')
    })

    it('returns danger at upper boundary 39.9°C', () => {
      expect(getAlertLevel(39.999).level).toBe('danger')
    })
  })

  describe('extreme level (≥ 40°C)', () => {
    it('returns extreme at lower boundary 40°C', () => {
      expect(getAlertLevel(40)).toEqual({
        level: 'extreme',
        message: 'Extreme Danger - Seek cooling immediately'
      })
    })

    it('returns extreme for 45°C', () => {
      expect(getAlertLevel(45).level).toBe('extreme')
    })

    it('returns extreme for very high temperature 100°C', () => {
      expect(getAlertLevel(100).level).toBe('extreme')
    })
  })

  describe('return structure', () => {
    it('always returns an object with level and message', () => {
      const result = getAlertLevel(25)
      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('message')
      expect(Object.keys(result)).toHaveLength(2)
    })

    it('level is always one of the four valid values', () => {
      const validLevels = ['safe', 'caution', 'danger', 'extreme']
      const temps = [-5, 0, 15, 29, 30, 32, 34, 35, 37, 39, 40, 50]
      for (const temp of temps) {
        expect(validLevels).toContain(getAlertLevel(temp).level)
      }
    })
  })
})
