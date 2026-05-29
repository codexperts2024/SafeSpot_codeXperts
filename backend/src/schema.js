import { pgTable, real, serial, text } from 'drizzle-orm/pg-core'

export const sensorReadings = pgTable('sensor_readings', {
  id: serial('id').primaryKey(),
  temperature: real('temperature').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull()
})
