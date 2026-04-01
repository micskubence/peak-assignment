import { applyDecorators } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { GetStockResponseDto } from '../dto/get-stock-response.dto';

export function GetStockDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the latest stored stock data for a symbol',
    }),
    ApiParam({
      name: 'symbol',
      example: 'AAPL',
      description: 'Ticker symbol to read from tracked stock data.',
    }),
    ApiOkResponse({
      type: GetStockResponseDto,
      description:
        'Latest stored stock price and moving average information for the symbol.',
    }),
    ApiNotFoundResponse({
      description: 'Tracking has not been started for the requested symbol.',
    }),
  );
}
