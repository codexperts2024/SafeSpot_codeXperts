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
    listReadings: () => [...savedReadings].reverse()
  }
}
