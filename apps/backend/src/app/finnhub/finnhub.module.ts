import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { PriceStoreService } from '../price-store/price-store.service';

@Module({
  providers: [FinnhubService, PriceStoreService],
  exports: [FinnhubService, PriceStoreService],
})
export class FinnhubModule {}
