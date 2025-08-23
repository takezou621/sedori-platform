import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { AmazonApiService } from './amazon-api.service';
import { RakutenApiService } from './rakuten-api.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MarketDataService, AmazonApiService, RakutenApiService],
  exports: [MarketDataService, AmazonApiService, RakutenApiService],
})
export class ExternalApisModule {}