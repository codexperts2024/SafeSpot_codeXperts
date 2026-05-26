export const createMockStore = () => {
  const savedReadings = []

  return {
    save: (temperature, source) => {
      const reading = {
        temperature,
        timestamp: new Date().toISOString(),
        source
      }
      savedReadings.push(reading)
      return reading
    },
    getLatest: () => savedReadings[savedReadings.length - 1] ?? null
  }
}
