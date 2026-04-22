import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';
import {
  CURRENCY_PAIRS,
  CurrencyPair,
  FINNHUB_SYMBOLS,
  TickerPrice,
} from '@cryptocurrency-dashboard/shared-types';
import { PriceStoreService } from '../price-store/price-store.service';

const FINNHUB_WS_URL = 'wss://ws.finnhub.io';
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;

type TradeMessage = {
  type: 'trade';
  data: { s: string; p: number; t: number; v: number }[];
};

@Injectable()
export class FinnhubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubService.name);
  private ws: WebSocket | null = null;
  private reconnectDelay = RECONNECT_DELAY_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private readonly onPriceCallbacks: ((ticker: TickerPrice) => void)[] = [];
  private readonly onStatusCallbacks: ((
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
    msg?: string,
  ) => void)[] = [];

  private readonly symbolToPair = new Map<string, CurrencyPair>(
    CURRENCY_PAIRS.map((pair) => [FINNHUB_SYMBOLS[pair], pair]),
  );

  constructor(private readonly priceStore: PriceStoreService) {}

  onModuleInit(): void {
    this.connect();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  onPrice(cb: (ticker: TickerPrice) => void): void {
    this.onPriceCallbacks.push(cb);
  }

  onStatus(
    cb: (status: 'connecting' | 'connected' | 'disconnected' | 'error', msg?: string) => void,
  ): void {
    this.onStatusCallbacks.push(cb);
  }

  private connect(): void {
    if (this.destroyed) return;
    const apiKey = process.env['FINNHUB_API_KEY'];
    if (!apiKey) {
      this.logger.error('FINNHUB_API_KEY env variable is not set');
      this.emitStatus('error', 'FINNHUB_API_KEY not configured');
      return;
    }

    this.logger.log('Connecting to Finnhub WebSocket...');
    this.emitStatus('connecting');

    this.ws = new WebSocket(`${FINNHUB_WS_URL}?token=${apiKey}`);

    this.ws.on('open', () => {
      this.logger.log('Connected to Finnhub WebSocket');
      this.reconnectDelay = RECONNECT_DELAY_MS;
      this.emitStatus('connected');
      this.subscribeToSymbols();
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('error', (err) => {
      this.logger.error(`Finnhub WebSocket error: ${err.message}`);
      this.emitStatus('error', err.message);
    });

    this.ws.on('close', () => {
      this.logger.warn('Finnhub WebSocket closed');
      this.emitStatus('disconnected');
      this.scheduleReconnect();
    });
  }

  private subscribeToSymbols(): void {
    for (const symbol of Object.values(FINNHUB_SYMBOLS)) {
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
      this.logger.log(`Subscribed to ${symbol}`);
    }
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as TradeMessage | { type: string };
      if (msg.type !== 'trade') return;

      for (const trade of (msg as TradeMessage).data) {
        const pair = this.symbolToPair.get(trade.s);
        if (!pair) continue;

        const ticker: TickerPrice = {
          pair,
          price: trade.p,
          timestamp: trade.t,
        };

        this.priceStore.addPrice(ticker);
        this.onPriceCallbacks.forEach((cb) => cb(ticker));
      }
    } catch {
      this.logger.error('Failed to parse Finnhub message');
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    this.logger.log(`Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      this.connect();
    }, this.reconnectDelay);
  }

  private emitStatus(
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
    msg?: string,
  ): void {
    this.onStatusCallbacks.forEach((cb) => cb(status, msg));
  }
}
