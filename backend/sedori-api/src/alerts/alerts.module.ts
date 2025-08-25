import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertManagerService } from './alert-manager.service';
import { AlertsController } from './alerts.controller';
import { ExternalApisModule } from '../external-apis/external-apis.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    }),
    ScheduleModule.forRoot(),
    ExternalApisModule,
    AiModule,
  ],
  controllers: [AlertsController],
  providers: [AlertManagerService],
  exports: [AlertManagerService],
})
export class AlertsModule {}