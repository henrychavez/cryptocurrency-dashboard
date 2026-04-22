import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CurrencyPair,
  CURRENCY_PAIRS,
  HourlyAverage,
  TickerPrice,
} from '@cryptocurrency-dashboard/shared-types';

interface PriceBuffer {
  prices: TickerPrice[];
  lastHourlyAverage: HourlyAverage | null;
}

@Injectable()
export class PriceStoreService {
  private readonly logger = new Logger(PriceStoreService.name);
  private readonly store = new Map<CurrencyPair, PriceBuffer>();
  private readonly onAverageCallbacks: ((avg: HourlyAverage) => void)[] = [];

  constructor() {
    for (const pair of CURRENCY_PAIRS) {
      this.store.set(pair, { prices: [], lastHourlyAverage: null });
    }
  }

  addPrice(ticker: TickerPrice): void {
    const buffer = this.store.get(ticker.pair);
    if (!buffer) return;
    buffer.prices.push(ticker);
    // keep at most 3600 data points per pair in memory
    if (buffer.prices.length > 3600) buffer.prices.shift();
  }

  getLatestPrice(pair: CurrencyPair): TickerPrice | null {
    const buffer = this.store.get(pair);
    if (!buffer || buffer.prices.length === 0) return null;
    return buffer.prices[buffer.prices.length - 1];
  }

  getPriceHistory(pair: CurrencyPair, limit = 60): TickerPrice[] {
    const buffer = this.store.get(pair);
    if (!buffer) return [];
    return buffer.prices.slice(-limit);
  }

  getLastHourlyAverage(pair: CurrencyPair): HourlyAverage | null {
    return this.store.get(pair)?.lastHourlyAverage ?? null;
  }

  onHourlyAverage(cb: (avg: HourlyAverage) => void): void {
    this.onAverageCallbacks.push(cb);
  }

  @Cron(CronExpression.EVERY_HOUR)
  computeHourlyAverages(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const pair of CURRENCY_PAIRS) {
      const buffer = this.store.get(pair)!;
      const window = buffer.prices.filter((p) => p.timestamp >= oneHourAgo);
      if (window.length === 0) continue;

      const average = window.reduce((sum, p) => sum + p.price, 0) / window.length;
      const hourlyAvg: HourlyAverage = {
        pair,
        average,
        periodStart: oneHourAgo,
        periodEnd: now,
        sampleCount: window.length,
      };

      buffer.lastHourlyAverage = hourlyAvg;
      this.logger.log(
        `Hourly average for ${pair}: ${average.toFixed(6)} (${window.length} samples)`,
      );
      this.onAverageCallbacks.forEach((cb) => cb(hourlyAvg));
    }
  }
}
