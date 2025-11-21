// src/utils/geoUtils.js

export const extraerCoordsDesdeUrl = (url) => {
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (match) {
      return {
        latitud: parseFloat(match[1]),
        longitud: parseFloat(match[2]),
      }
    }
    return null
  }
  
  export const getEmojiForTipo = (tipo) => {
    switch (tipo) {
      case 'propia':
        return '🏢'
      case 'rival':
        return '⚔️'
      case 'cartel':
        return '📢'
      case 'alquiler':
        return '🏠'
      case 'potencial':
        return '🌟'
      default:
        return '📍'
    }
  }
  