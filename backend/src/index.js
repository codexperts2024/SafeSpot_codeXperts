import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { createDatabase } from './db.js'
import './load-env.js'

const DEFAULT_PORT = 8000
const parsedPort = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10)
const port =
  Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT

const { db, initializeDatabase, close } = createDatabase()

await initializeDatabase()

const app = createApp({ db })

const server = serve({
  fetch: app.fetch,
  port
})

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`)
  server.close()
  await close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
