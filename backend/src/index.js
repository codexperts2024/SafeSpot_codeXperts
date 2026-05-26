import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { initializeDatabase, seedMockData } from './db.js'

const DEFAULT_PORT = 8000
const parsedPort = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10)
const port =
  Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT

initializeDatabase()
seedMockData()

const app = createApp()

serve({
  fetch: app.fetch,
  port
})

console.log(`SafeSpot backend running on http://localhost:${port}`)
