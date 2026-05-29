import { describe, expect, it, vi } from 'vitest'
import { createDatabase, createPostgresPoolConfig } from '../src/db.js'

describe('PostgreSQL configuration', () => {
  it('uses PG_URL when provided', () => {
    const config = createPostgresPoolConfig({
      PG_URL: 'postgres://user:password@db.example.com:5432/safespot'
    })

    expect(config).toEqual({
      connectionString: 'postgres://user:password@db.example.com:5432/safespot'
    })
  })

  it('throws when PG_URL is missing', () => {
    expect(() => createPostgresPoolConfig({})).toThrow(
      'Missing PostgreSQL configuration: PG_URL'
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
