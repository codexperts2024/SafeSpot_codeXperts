import './src/load-env.js'

export default {
  schema: './src/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PG_URL
  }
}
