import { ApiProperty } from '@nestjs/swagger';

export class StartTrackingResponseDto {
  @ApiProperty({
    example: 'AAPL',
    description: 'Normalized stock symbol that is being tracked.',
  })
  symbol: string;

  @ApiProperty({
    example: true,
    description: 'Whether tracking is currently active for the symbol.',
  })
  trackingActive: boolean;

  @ApiProperty({
    example: '2026-04-01T20:00:44.852Z',
    description: 'ISO timestamp when tracking started for this symbol.',
  })
  startedAt: string;
}
