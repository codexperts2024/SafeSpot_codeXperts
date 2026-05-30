export const calculateHumidex = (temperature, humidity) => {
  if (humidity === null || humidity === undefined) {
    return null
  }

  if (!Number.isFinite(temperature)) {
    return null
  }

  const dewPoint = temperature - (100 - humidity) / 5
  const vapourPressure =
    6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (273.16 + dewPoint)))
  const humidex = Math.max(
    temperature,
    temperature + 0.5555 * (vapourPressure - 10)
  )

  return Math.round(humidex * 10) / 10
}
