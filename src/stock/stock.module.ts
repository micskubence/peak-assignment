import { Module } from '@nestjs/common';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StockController } from './stock.controller';
import { StockIngestionService } from './stock-ingestion.service';
import { StockScheduler } from './stock.scheduler';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule, FinnhubModule],
  controllers: [StockController],
  providers: [StockService, StockIngestionService, StockScheduler],
  exports: [StockService, StockIngestionService],
})
export class StockModule {}
