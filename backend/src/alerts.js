export const ALERT_THRESHOLDS = {
  caution: 30,
  danger: 40,
  extreme: 45
}

export const getAlertLevel = (temperature) => {
  if (temperature > ALERT_THRESHOLDS.extreme) {
    return {
      level: 'extreme',
      message: 'Extreme Danger - Seek cooling immediately'
    }
  }

  if (temperature >= ALERT_THRESHOLDS.danger) {
    return {
      level: 'danger',
      message: 'Extreme Heat Warning - Find a Cool Space Now'
    }
  }

  if (temperature >= ALERT_THRESHOLDS.caution) {
    return {
      level: 'caution',
      message: 'Heat Caution - Stay hydrated and cool'
    }
  }

  return { level: 'safe', message: 'Temperature is safe' }
}
