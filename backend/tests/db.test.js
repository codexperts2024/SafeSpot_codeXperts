import { describe, expect, it, vi } from 'vitest'
import { createDatabase, createPostgresPoolConfig } from '../src/db.js'

describe('PostgreSQL configuration', () => {
  it('uses PG_URL when provided', () => {
    const config = createPostgresPoolConfig({
      PG_URL: 'postgres://user:pass@example.com:5432/safespot'
    })

    expect(config.connectionString).toBe(
      'postgres://user:pass@example.com:5432/safespot'
    )
    expect(config.ssl).toEqual({ rejectUnauthorized: false })
  })

  it('falls back to individual PG_* values', () => {
    const config = createPostgresPoolConfig({
      PG_HOSTNAME: 'localhost',
      PG_PORT: '5433',
      PG_DATABASE: 'sensor_readings',
      PG_USERNAME: 'sensor_readings_user',
      PG_PASSWORD: 'secret'
    })

    expect(config).toEqual({
      host: 'localhost',
      port: 5433,
      database: 'sensor_readings',
      user: 'sensor_readings_user',
      password: 'secret',
      ssl: false
    })
  })

  it('throws when required values are missing', () => {
    expect(() => createPostgresPoolConfig({})).toThrow(
      'Missing PostgreSQL configuration'
    )
  })
})

describe('Database initialization', () => {
  it('creates the sensor_readings table', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({}),
      end: vi.fn().mockResolvedValue()
    }
    const instance = createDatabase({ pool })

    await instance.initializeDatabase()

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sensor_readings')
    )
  })

  it('closes the PostgreSQL pool', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({}),
      end: vi.fn().mockResolvedValue()
    }
    const instance = createDatabase({ pool })

    await instance.close()

    expect(pool.end).toHaveBeenCalled()
  })
})
