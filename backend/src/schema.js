import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const sensorReadings = sqliteTable('sensor_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  temperature: real('temperature').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull()
})
