import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

const { Pool } = pg

export const createPostgresPoolConfig = (env = process.env) => {
  if (!env.PG_URL) {
    throw new Error('Missing PostgreSQL configuration: PG_URL. Set PG_URL.')
  }

  return {
    connectionString: env.PG_URL
  }
}

export const createDatabase = ({ env = process.env, pool } = {}) => {
  const postgresPool = pool ?? new Pool(createPostgresPoolConfig(env))
  const db = drizzle(postgresPool)

  // Source of truth for the runtime database DDL. The Drizzle definitions in
  // schema.js describe query shapes only and do not create these tables — keep
  // the columns/indexes here in lockstep with schema.js.
  const initializeDatabase = async () => {
    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id SERIAL PRIMARY KEY,
        temperature REAL NOT NULL,
        humidity REAL,
        humidex REAL,
        source TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )
    `)

    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS alert_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        temperature REAL NOT NULL,
        humidex REAL,
        humidity REAL,
        alert_level TEXT NOT NULL,
        lat REAL,
        lng REAL,
        zone TEXT
      )
    `)

    await postgresPool.query(
      'CREATE INDEX IF NOT EXISTS idx_sensor_readings_source_id ON sensor_readings (source, id DESC)'
    )
    await postgresPool.query(
      'CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at ON sensor_readings (created_at)'
    )
    await postgresPool.query(
      'CREATE INDEX IF NOT EXISTS idx_alert_logs_timestamp ON alert_logs (timestamp)'
    )
    await postgresPool.query(
      'CREATE INDEX IF NOT EXISTS idx_alert_logs_alert_level ON alert_logs (alert_level)'
    )
    await postgresPool.query(
      'CREATE INDEX IF NOT EXISTS idx_alert_logs_zone ON alert_logs (zone)'
    )
  }

  const close = () => postgresPool.end()

  return { db, pool: postgresPool, initializeDatabase, close }
}
