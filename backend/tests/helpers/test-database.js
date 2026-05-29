import { alertLogs, sensorReadings } from '../../src/schema.js'

const createQuery = (rows) => ({
  orderBy: () => createQuery(rows),
  limit: (count) => Promise.resolve(rows.slice(-count).reverse()),
  then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject)
})

export const createTestDatabase = () => {
  const rows = []
  const alertRows = []

  const getRowsForTable = (table) => {
    if (table === sensorReadings) {
      return rows
    }

    if (table === alertLogs) {
      return alertRows
    }

    return rows
  }

  return {
    rows,
    alertRows,
    insert: (table) => ({
      values: async (value) => {
        const targetRows = getRowsForTable(table)
        targetRows.push({ ...value, id: targetRows.length + 1 })
      }
    }),
    select: () => ({
      from: (table) => createQuery(getRowsForTable(table))
    })
  }
}
