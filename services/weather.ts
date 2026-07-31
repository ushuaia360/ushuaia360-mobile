import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/**
 * Open-Meteo: API pública sin key. Se llama directo desde el cliente (no pasa por `API_BASE_URL`,
 * es un servicio externo distinto del backend propio).
 */
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export interface DailyWeather {
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  windSpeedMax: number;
}

export async function fetchTodayWeather(latitude: number, longitude: number): Promise<DailyWeather> {
  const url =
    `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max` +
    `&timezone=auto&forecast_days=1`;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`weather request failed: ${res.status}`);
    const data = await res.json();
    const daily = data?.daily;
    if (!daily?.temperature_2m_max?.length) throw new Error('weather response missing daily data');
    return {
      temperatureMax: Math.round(daily.temperature_2m_max[0]),
      temperatureMin: Math.round(daily.temperature_2m_min[0]),
      weatherCode: daily.weathercode[0],
      windSpeedMax: Math.round(daily.windspeed_10m_max[0]),
    };
  } finally {
    clearTimeout(timeout);
  }
}

type IonName = ComponentProps<typeof Ionicons>['name'];

export interface WeatherVisual {
  icon: IonName;
  labelKey: string;
}

/** Códigos WMO (weathercode de Open-Meteo) agrupados en categorías visuales simples. */
export function getWeatherVisual(code: number): WeatherVisual {
  if (code === 0) return { icon: 'sunny-outline', labelKey: 'weather.codes.clear' };
  if (code === 1 || code === 2) return { icon: 'partly-sunny-outline', labelKey: 'weather.codes.partlyCloudy' };
  if (code === 3) return { icon: 'cloudy-outline', labelKey: 'weather.codes.cloudy' };
  if (code === 45 || code === 48) return { icon: 'cloud-outline', labelKey: 'weather.codes.fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: 'rainy-outline', labelKey: 'weather.codes.drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: 'rainy-outline', labelKey: 'weather.codes.rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: 'snow-outline', labelKey: 'weather.codes.snow' };
  if ([95, 96, 99].includes(code)) return { icon: 'thunderstorm-outline', labelKey: 'weather.codes.thunderstorm' };
  return { icon: 'partly-sunny-outline', labelKey: 'weather.codes.unknown' };
}
