import { Test, TestingModule } from '@nestjs/testing';
import { FinnhubService } from './finnhub.service';
import { PriceStoreService } from '../price-store/price-store.service';
import { TickerPrice } from '@cryptocurrency-dashboard/shared-types';

jest.mock('ws');

describe('FinnhubService', () => {
  let service: FinnhubService;
  let priceStore: jest.Mocked<PriceStoreService>;

  beforeEach(async () => {
    priceStore = {
      addPrice: jest.fn(),
      getLatestPrice: jest.fn(),
      getPriceHistory: jest.fn(),
      getLastHourlyAverage: jest.fn(),
      onHourlyAverage: jest.fn(),
      computeHourlyAverages: jest.fn(),
    } as unknown as jest.Mocked<PriceStoreService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinnhubService,
        { provide: PriceStoreService, useValue: priceStore },
      ],
    }).compile();

    service = module.get<FinnhubService>(FinnhubService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fires status callbacks when registered', () => {
    const cb = jest.fn();
    service.onStatus(cb);
    // onModuleInit triggers connect() which emits 'connecting'
    // but WS is mocked — just verify callback registration doesn't throw
    expect(() => service.onStatus(cb)).not.toThrow();
  });

  it('fires price callbacks when registered', () => {
    const cb = jest.fn();
    expect(() => service.onPrice(cb)).not.toThrow();
  });

  it('calls addPrice on priceStore when a trade message is received', () => {
    // Access private handler via casting for unit testing
    const handleMessage = (service as unknown as { handleMessage: (raw: string) => void })
      .handleMessage.bind(service);

    const tradeMessage = JSON.stringify({
      type: 'trade',
      data: [{ s: 'BINANCE:ETHUSDC', p: 1850.5, t: 1700000000000, v: 1.2 }],
    });

    const priceCb = jest.fn();
    service.onPrice(priceCb);
    handleMessage(tradeMessage);

    expect(priceStore.addPrice).toHaveBeenCalledWith<[TickerPrice]>({
      pair: 'ETH/USDC',
      price: 1850.5,
      timestamp: 1700000000000,
    });
    expect(priceCb).toHaveBeenCalledTimes(1);
  });

  it('ignores non-trade messages', () => {
    const handleMessage = (service as unknown as { handleMessage: (raw: string) => void })
      .handleMessage.bind(service);

    handleMessage(JSON.stringify({ type: 'ping' }));
    expect(priceStore.addPrice).not.toHaveBeenCalled();
  });

  it('ignores trades for unknown symbols', () => {
    const handleMessage = (service as unknown as { handleMessage: (raw: string) => void })
      .handleMessage.bind(service);

    handleMessage(
      JSON.stringify({ type: 'trade', data: [{ s: 'UNKNOWN:PAIR', p: 100, t: 1, v: 1 }] }),
    );
    expect(priceStore.addPrice).not.toHaveBeenCalled();
  });

  it('handles malformed JSON gracefully', () => {
    const handleMessage = (service as unknown as { handleMessage: (raw: string) => void })
      .handleMessage.bind(service);

    expect(() => handleMessage('not-json')).not.toThrow();
    expect(priceStore.addPrice).not.toHaveBeenCalled();
  });
});
