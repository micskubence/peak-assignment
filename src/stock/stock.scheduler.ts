import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockIngestionService } from './stock-ingestion.service';

@Injectable()
export class StockScheduler {
  constructor(private readonly stockIngestionService: StockIngestionService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async ingestTrackedSymbols(): Promise<void> {
    await this.stockIngestionService.ingestActiveSymbols();
  }
}
