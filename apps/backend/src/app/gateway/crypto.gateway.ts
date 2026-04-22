import { Logger, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  CURRENCY_PAIRS,
  CurrencyPair,
  WEBSOCKET_EVENTS,
} from '@cryptocurrency-dashboard/shared-types';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PriceStoreService } from '../price-store/price-store.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class CryptoGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(CryptoGateway.name);

  constructor(
    private readonly finnhub: FinnhubService,
    private readonly priceStore: PriceStoreService,
  ) {}

  onModuleInit(): void {
    this.finnhub.onPrice((ticker) => {
      this.server.emit(WEBSOCKET_EVENTS.PRICE_UPDATE, ticker);
    });

    this.finnhub.onStatus((status, message) => {
      this.server.emit(WEBSOCKET_EVENTS.CONNECTION_STATUS, { status, message });
    });

    this.priceStore.onHourlyAverage((avg) => {
      this.server.emit(WEBSOCKET_EVENTS.HOURLY_AVERAGE, avg);
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.sendInitialSnapshot(client);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('request_snapshot')
  handleSnapshotRequest(@MessageBody() _data: unknown): void {
    // handled via handleConnection; kept for explicit client requests
  }

  private sendInitialSnapshot(client: Socket): void {
    for (const pair of CURRENCY_PAIRS) {
      const latest = this.priceStore.getLatestPrice(pair);
      const history = this.priceStore.getPriceHistory(pair);
      const hourly = this.priceStore.getLastHourlyAverage(pair);

      if (latest) client.emit(WEBSOCKET_EVENTS.PRICE_UPDATE, latest);
      if (history.length > 0)
        client.emit('price_history', { pair, history } as { pair: CurrencyPair; history: typeof history });
      if (hourly) client.emit(WEBSOCKET_EVENTS.HOURLY_AVERAGE, hourly);
    }
  }
}
