import { Controller, Param, Put } from '@nestjs/common';
import { StartTrackingResponseDto } from './dto/start-tracking-response.dto';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Put(':symbol')
  startTracking(
    @Param('symbol') symbol: string,
  ): Promise<StartTrackingResponseDto> {
    return this.stockService.startTracking(symbol);
  }
}
