export interface FinnhubQuoteResponse {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export interface FinnhubErrorResponse {
  error: string;
}

export interface StockQuote {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  fetchedAt: string;
  sourceTimestamp: string | null;
}
