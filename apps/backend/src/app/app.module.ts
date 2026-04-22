import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinnhubModule } from './finnhub/finnhub.module';
import { CryptoGateway } from './gateway/crypto.gateway';

@Module({
  imports: [ScheduleModule.forRoot(), FinnhubModule],
  providers: [CryptoGateway],
})
export class AppModule {}
