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
