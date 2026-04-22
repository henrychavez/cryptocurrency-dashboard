export type CurrencyPair = 'ETH/USDC' | 'ETH/USDT' | 'ETH/BTC';

export interface TickerPrice {
  pair: CurrencyPair;
  price: number;
  timestamp: number;
}

export interface HourlyAverage {
  pair: CurrencyPair;
  average: number;
  periodStart: number;
  periodEnd: number;
  sampleCount: number;
}

export interface PairState {
  pair: CurrencyPair;
  currentPrice: number | null;
  lastUpdated: number | null;
  hourlyAverage: number | null;
  priceHistory: TickerPrice[];
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
}

export interface DashboardUpdate {
  type: 'price' | 'hourly_average' | 'connection_status';
  payload: TickerPrice | HourlyAverage | ConnectionStatus;
}

export const CURRENCY_PAIRS: CurrencyPair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];

export const FINNHUB_SYMBOLS: Record<CurrencyPair, string> = {
  'ETH/USDC': 'BINANCE:ETHUSDC',
  'ETH/USDT': 'BINANCE:ETHUSDT',
  'ETH/BTC': 'BINANCE:ETHBTC',
};

export const WEBSOCKET_EVENTS = {
  PRICE_UPDATE: 'price_update',
  HOURLY_AVERAGE: 'hourly_average',
  CONNECTION_STATUS: 'connection_status',
} as const;
