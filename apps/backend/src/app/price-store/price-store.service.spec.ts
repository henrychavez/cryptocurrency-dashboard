import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { PriceStoreService } from './price-store.service';
import { TickerPrice, HourlyAverage } from '@cryptocurrency-dashboard/shared-types';

describe('PriceStoreService', () => {
  let service: PriceStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [PriceStoreService],
    }).compile();
    service = module.get<PriceStoreService>(PriceStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addPrice / getLatestPrice', () => {
    it('returns null when no prices added', () => {
      expect(service.getLatestPrice('ETH/USDC')).toBeNull();
    });

    it('returns the last added price', () => {
      const tick: TickerPrice = { pair: 'ETH/USDC', price: 1800, timestamp: Date.now() };
      service.addPrice(tick);
      expect(service.getLatestPrice('ETH/USDC')).toEqual(tick);
    });

    it('tracks each pair independently', () => {
      service.addPrice({ pair: 'ETH/USDC', price: 1800, timestamp: 1 });
      service.addPrice({ pair: 'ETH/USDT', price: 1801, timestamp: 2 });
      expect(service.getLatestPrice('ETH/USDC')?.price).toBe(1800);
      expect(service.getLatestPrice('ETH/USDT')?.price).toBe(1801);
      expect(service.getLatestPrice('ETH/BTC')).toBeNull();
    });
  });

  describe('getPriceHistory', () => {
    it('returns empty array for unknown pair', () => {
      expect(service.getPriceHistory('ETH/BTC')).toEqual([]);
    });

    it('returns history up to limit', () => {
      for (let i = 0; i < 100; i++) {
        service.addPrice({ pair: 'ETH/USDC', price: i, timestamp: i });
      }
      const history = service.getPriceHistory('ETH/USDC', 10);
      expect(history).toHaveLength(10);
      expect(history[history.length - 1].price).toBe(99);
    });
  });

  describe('computeHourlyAverages', () => {
    it('computes correct average and fires callbacks', () => {
      const now = Date.now();
      const prices = [1000, 2000, 3000];
      for (const price of prices) {
        service.addPrice({ pair: 'ETH/USDC', price, timestamp: now - 1000 });
      }

      const received: HourlyAverage[] = [];
      service.onHourlyAverage((avg) => received.push(avg));

      service.computeHourlyAverages();

      expect(received).toHaveLength(1);
      expect(received[0].pair).toBe('ETH/USDC');
      expect(received[0].average).toBe(2000);
      expect(received[0].sampleCount).toBe(3);
    });

    it('persists last hourly average', () => {
      const now = Date.now();
      service.addPrice({ pair: 'ETH/BTC', price: 0.05, timestamp: now - 100 });
      service.computeHourlyAverages();
      const avg = service.getLastHourlyAverage('ETH/BTC');
      expect(avg).not.toBeNull();
      expect(avg?.average).toBe(0.05);
    });

    it('skips pairs with no data', () => {
      const received: HourlyAverage[] = [];
      service.onHourlyAverage((avg) => received.push(avg));
      service.computeHourlyAverages();
      expect(received).toHaveLength(0);
    });

    it('excludes prices older than 1 hour', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      service.addPrice({ pair: 'ETH/USDT', price: 9999, timestamp: twoHoursAgo });

      const received: HourlyAverage[] = [];
      service.onHourlyAverage((avg) => received.push(avg));
      service.computeHourlyAverages();

      expect(received).toHaveLength(0);
    });
  });
});
