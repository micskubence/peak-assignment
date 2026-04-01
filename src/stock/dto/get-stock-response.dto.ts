import { ApiProperty } from '@nestjs/swagger';

export class GetStockResponseDto {
  @ApiProperty({
    example: 'AAPL',
    description: 'Normalized stock symbol.',
  })
  symbol: string;

  @ApiProperty({
    example: 255.63,
    nullable: true,
    description: 'Latest stored stock price for the symbol.',
  })
  currentPrice: number | null;

  @ApiProperty({
    example: '2026-04-01T20:37:02.426Z',
    nullable: true,
    description: 'ISO timestamp of the latest stored price update.',
  })
  lastUpdatedAt: string | null;

  @ApiProperty({
    example: 254.981,
    nullable: true,
    description: 'Moving average calculated from the latest 10 stored prices.',
  })
  movingAverage10: number | null;

  @ApiProperty({
    example: 10,
    description: 'Number of stored samples considered for the response.',
  })
  sampleCount: number;

  @ApiProperty({
    example: true,
    description: 'Whether tracking is currently active for the symbol.',
  })
  trackingActive: boolean;

  @ApiProperty({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'PENDING_FIRST_FETCH'],
    description: 'Tracking status for the symbol.',
  })
  status: 'ACTIVE' | 'PENDING_FIRST_FETCH';
}
