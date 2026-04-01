import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { FinnhubModule } from './finnhub/finnhub.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    FinnhubModule,
    PrismaModule,
    HealthModule,
    StockModule,
  ],
})
export class AppModule {}
