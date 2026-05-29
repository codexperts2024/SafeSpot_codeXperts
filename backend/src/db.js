import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

const { Pool } = pg

const isLocalHost = (host) =>
  ['localhost', '127.0.0.1', '::1'].includes(host ?? '')

const parseBoolean = (value) => {
  if (value === undefined) return undefined
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const sslConfig = (env, connectionString) => {
  const explicitSsl = parseBoolean(env.PG_SSL)
  if (explicitSsl === false) return false
  if (explicitSsl === true) return { rejectUnauthorized: false }

  if (connectionString) {
    const { hostname } = new URL(connectionString)
    return isLocalHost(hostname) ? false : { rejectUnauthorized: false }
  }

  return isLocalHost(env.PG_HOSTNAME) ? false : { rejectUnauthorized: false }
}

export const createPostgresPoolConfig = (env = process.env) => {
  const connectionString = env.PG_URL ?? env.DATABASE_URL
  if (connectionString) {
    return {
      connectionString,
      ssl: sslConfig(env, connectionString)
    }
  }

  const missing = ['PG_HOSTNAME', 'PG_DATABASE', 'PG_USERNAME', 'PG_PASSWORD']
    .filter((key) => !env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing PostgreSQL configuration: ${missing.join(', ')}. ` +
        'Set PG_URL or PG_HOSTNAME, PG_DATABASE, PG_USERNAME, and PG_PASSWORD.'
    )
  }

  return {
    host: env.PG_HOSTNAME,
    port: Number.parseInt(env.PG_PORT ?? '5432', 10),
    database: env.PG_DATABASE,
    user: env.PG_USERNAME,
    password: env.PG_PASSWORD,
    ssl: sslConfig(env)
  }
}

export const createDatabase = ({ env = process.env, pool } = {}) => {
  const postgresPool = pool ?? new Pool(createPostgresPoolConfig(env))
  const db = drizzle(postgresPool)

  const initializeDatabase = async () => {
    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id SERIAL PRIMARY KEY,
        temperature REAL NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
  }

  const close = () => postgresPool.end()

  return { db, pool: postgresPool, initializeDatabase, close }
}
