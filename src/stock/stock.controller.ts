import { Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetStockDocs } from './docs/get-stock.docs';
import { StartTrackingDocs } from './docs/start-tracking.docs';
import { GetStockResponseDto } from './dto/get-stock-response.dto';
import { StartTrackingResponseDto } from './dto/start-tracking-response.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @GetStockDocs()
  @Get(':symbol')
  getStock(@Param('symbol') symbol: string): Promise<GetStockResponseDto> {
    return this.stockService.getStock(symbol);
  }

  @StartTrackingDocs()
  @Put(':symbol')
  startTracking(
    @Param('symbol') symbol: string,
  ): Promise<StartTrackingResponseDto> {
    return this.stockService.startTracking(symbol);
  }
}
