export const getAlertLevel = (temperature) => {
  if (temperature > 45) {
    return {
      level: 'extreme',
      message: 'Extreme Danger - Seek cooling immediately'
    }
  }

  if (temperature >= 40) {
    return {
      level: 'danger',
      message: 'Extreme Heat Warning - Find a Cool Space Now'
    }
  }

  if (temperature >= 30) {
    return {
      level: 'caution',
      message: 'Heat Caution - Stay hydrated and cool'
    }
  }

  return { level: 'safe', message: 'Temperature is safe' }
}
