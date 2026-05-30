import { pgTable, real, serial, text } from 'drizzle-orm/pg-core'

// These definitions describe query shapes only — they are NOT what creates the
// tables at runtime. The actual DDL lives in db.js `initializeDatabase`. Keep the
// two in lockstep: any column/table change here must be mirrored there (and vice
// versa), otherwise `CREATE TABLE IF NOT EXISTS` will silently skip the new shape
// on an existing database.

export const sensorReadings = pgTable('sensor_readings', {
  id: serial('id').primaryKey(),
  temperature: real('temperature').notNull(),
  humidity: real('humidity'),
  humidex: real('humidex'),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull()
})

export const alertLogs = pgTable('alert_logs', {
  id: serial('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  temperature: real('temperature').notNull(),
  humidex: real('humidex'),
  humidity: real('humidity'),
  alertLevel: text('alert_level').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  zone: text('zone')
})
