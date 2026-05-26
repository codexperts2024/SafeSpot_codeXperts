import { createDatabase } from '../../src/db.js'

export const createTestDatabase = () => {
  const { db, initializeDatabase } = createDatabase({
    filename: ':memory:'
  })
  initializeDatabase()
  return db
}
