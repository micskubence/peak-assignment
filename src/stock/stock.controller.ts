import { Controller, Get, Param, Put } from '@nestjs/common';
import { GetStockResponseDto } from './dto/get-stock-response.dto';
import { StartTrackingResponseDto } from './dto/start-tracking-response.dto';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  getStock(@Param('symbol') symbol: string): Promise<GetStockResponseDto> {
    return this.stockService.getStock(symbol);
  }

  @Put(':symbol')
  startTracking(
    @Param('symbol') symbol: string,
  ): Promise<StartTrackingResponseDto> {
    return this.stockService.startTracking(symbol);
  }
}
