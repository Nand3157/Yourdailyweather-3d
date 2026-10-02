export type WeatherCondition =
  | "sunny"
  | "partlyCloudy"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "fog"
  | "wind"
  | "night";

export interface CurrentWeather {
  temperature: number; // °C
  feelsLike: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees
  precipitationProbability: number; // %
  precipitation: number; // mm
  conditions: string;
  description: string;
  uvIndex?: number;
  visibility?: number; // km
  cloudCover?: number; // %
  pressure?: number; // hPa
  dew?: number; // °C
  sunrise?: string;
  sunset?: string;
  icon: string;
  datetimeEpoch: number;
}

export interface HourlyWeather {
  timestamp: number; // epoch seconds
  temperature: number; // °C
  feelsLike: number; // °C
  precipitationProbability: number; // %
  precipitation: number; // mm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  conditions: string;
  icon: string;
  humidity: number; // %
  cloudCover: number; // %
  isPast?: boolean;
  isNow?: boolean;
}

export interface DailyForecast {
  date: number; // epoch seconds — location-local midnight of that day
  tempMin: number; // °C
  tempMax: number; // °C
  precipitationProbability: number; // %
  precipitation: number; // mm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  humidity: number; // %
  uvIndex?: number;
  conditions: string;
  icon: string;
  sunrise?: string;
  sunset?: string;
  isToday: boolean;
}

export interface WeatherLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherResponse {
  location: WeatherLocation;
  current: CurrentWeather;
  previous24Hours: HourlyWeather[];
  next24Hours: HourlyWeather[];
  daily: DailyForecast[];
  sunrise: string;
  sunset: string;
  timezone: string;
  updatedAt: number;
  demo?: boolean;
}
