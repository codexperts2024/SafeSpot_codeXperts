import { calculateHumidex } from '../../src/humidex.js'

export const createMockStore = () => {
  const savedReadings = []

  return {
    save: (temperature, source, humidity = null) => {
      const reading = {
        temperature,
        humidity,
        humidex: calculateHumidex(temperature, humidity),
        timestamp: new Date().toISOString(),
        source
      }
      savedReadings.push(reading)
      return reading
    },
    getLatest: () => savedReadings[savedReadings.length - 1] ?? null,
    listReadings: ({ limit = 100, from, to } = {}) => {
      let results = [...savedReadings].reverse()
      if (from) results = results.filter((r) => r.timestamp >= from.toISOString())
      if (to) results = results.filter((r) => r.timestamp <= to.toISOString())
      return results.slice(0, limit)
    }
  }
}
