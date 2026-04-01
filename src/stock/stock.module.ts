import { Module } from '@nestjs/common';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule, FinnhubModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
