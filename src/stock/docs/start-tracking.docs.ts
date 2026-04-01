import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { StartTrackingResponseDto } from '../dto/start-tracking-response.dto';

export function StartTrackingDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Start tracking a stock symbol',
    }),
    ApiParam({
      name: 'symbol',
      example: 'AAPL',
      description: 'Ticker symbol to start tracking.',
    }),
    ApiOkResponse({
      type: StartTrackingResponseDto,
      description: 'Tracking started or reactivated successfully.',
    }),
    ApiBadRequestResponse({
      description:
        'The provided stock symbol is invalid or unsupported by Finnhub.',
    }),
  );
}
