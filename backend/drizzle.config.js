import { loadEnvironment } from './src/load-env.js'

loadEnvironment()

export default {
  schema: './src/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PG_URL ?? process.env.DATABASE_URL
  }
}
