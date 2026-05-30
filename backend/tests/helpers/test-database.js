import { alertLogs, sensorReadings } from '../../src/schema.js'

const parseSqlCondition = (sql) => {
  if (!sql?.queryChunks) return null

  let column = null
  let operator = null
  let value = null

  for (const chunk of sql.queryChunks) {
    // Column reference (PgText, PgReal, etc.)
    if (chunk?.name && chunk?.table) {
      column = chunk.name
    }

    // String chunk with operator
    if (chunk?.value && Array.isArray(chunk.value)) {
      const str = chunk.value.join('')
      if (str.includes(' >= ')) operator = '>='
      else if (str.includes(' <= ')) operator = '<='
      else if (str.includes(' > ')) operator = '>'
      else if (str.includes(' < ')) operator = '<'
      else if (str.includes(' = ')) operator = '='
    }

    // Param — has value but no name, no queryChunks
    if (
      chunk?.value !== undefined &&
      !chunk?.name &&
      !chunk?.queryChunks &&
      !Array.isArray(chunk.value)
    ) {
      value = chunk.value
    }
  }

  return column && value !== undefined && operator
    ? { column, operator, value }
    : null
}

// Recursively extract all conditions from a SQL object (handles and(), or(), etc.)
const extractConditions = (sql) => {
  if (!sql?.queryChunks) return []

  const conditions = []

  for (const chunk of sql.queryChunks) {
    // Nested SQL chunk (from and()/or())
    if (chunk?.queryChunks) {
      conditions.push(...extractConditions(chunk))
    }
  }

  // If no nested conditions found, this might be a leaf condition itself
  if (conditions.length === 0) {
    const parsed = parseSqlCondition(sql)
    if (parsed) conditions.push(parsed)
  }

  return conditions
}

// Map drizzle DB column names (snake_case) to JS property names (camelCase)
// The test mock stores rows with JS keys but drizzle conditions use DB column names
const COLUMN_MAP = {
  created_at: 'createdAt',
  alert_level: 'alertLevel',
  temperature: 'temperature',
  humidity: 'humidity',
  humidex: 'humidex',
  source: 'source',
  id: 'id',
  timestamp: 'timestamp',
  lat: 'lat',
  lng: 'lng',
  zone: 'zone'
}

const resolveColumn = (dbColName, row) => {
  // Try JS property name first, then fall back to DB name
  const jsName = COLUMN_MAP[dbColName] ?? dbColName
  return row[jsName] !== undefined ? jsName : dbColName
}

const createQuery = (rows) => {
  const conditions = []
  let descending = false
  const resolveRows = () => {
    const filtered = applyConditions(rows, conditions)
    return descending ? [...filtered].reverse() : filtered
  }

  const chain = Object.assign(Promise.resolve().then(resolveRows), {
    where: (...args) => {
      for (const arg of args) {
        conditions.push(...extractConditions(arg))
      }
      return chain
    },
    orderBy: (...args) => {
      for (const arg of args) {
        if (arg?.queryChunks) {
          for (const chunk of arg.queryChunks) {
            if (
              chunk?.value &&
              Array.isArray(chunk.value) &&
              chunk.value.join('').toUpperCase().includes('DESC')
            ) {
              descending = true
            }
          }
        }
      }
      return chain
    },
    limit: (count) => {
      return Promise.resolve(resolveRows().slice(0, count))
    }
  })

  return chain
}

// Normalize values for comparison. Timestamptz columns receive Date objects
// from the query layer; rows may store ISO strings or Dates. Coerce Dates to
// ISO strings so date comparisons stay lexicographically correct (matching how
// Postgres compares timestamps), mirroring real driver behavior.
const normalizeValue = (value) =>
  value instanceof Date ? value.toISOString() : String(value)

const applyConditions = (rows, conditions) => {
  if (conditions.length === 0) return rows

  return rows.filter((row) =>
    conditions.every(({ column, operator, value }) => {
      const resolvedCol = resolveColumn(column, row)
      const rowValue = row[resolvedCol]
      if (rowValue === undefined) return true

      const left = normalizeValue(rowValue)
      const right = normalizeValue(value)

      switch (operator) {
        case '=':
          return left === right
        case '>=':
          return left >= right
        case '<=':
          return left <= right
        case '>':
          return left > right
        case '<':
          return left < right
        default:
          return true
      }
    })
  )
}

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
