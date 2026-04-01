export interface GetStockResponseDto {
  symbol: string;
  currentPrice: number | null;
  lastUpdatedAt: string | null;
  movingAverage10: number | null;
  sampleCount: number;
  trackingActive: boolean;
  status: 'ACTIVE' | 'PENDING_FIRST_FETCH';
}
