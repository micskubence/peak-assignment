import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FinnhubErrorResponse,
  FinnhubQuoteResponse,
  StockQuote,
} from './finnhub.types';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_TIMEOUT_MS = 10_000;

@Injectable()
export class FinnhubService {
  constructor(private readonly configService: ConfigService) {}

  async getQuote(symbol: string): Promise<StockQuote> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const apiKey = this.configService.get<string>('FINNHUB_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'FINNHUB_API_KEY is not configured.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FINNHUB_TIMEOUT_MS);
    const requestUrl = new URL('/quote', FINNHUB_BASE_URL);

    requestUrl.searchParams.set('symbol', normalizedSymbol);
    requestUrl.searchParams.set('token', apiKey);

    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Finnhub request failed with status ${response.status}.`,
        );
      }

      const payload: unknown = await response.json();

      if (this.isFinnhubErrorResponse(payload)) {
        throw new BadGatewayException(
          `Finnhub error: ${payload.error || 'Unknown upstream error.'}`,
        );
      }

      if (!this.isFinnhubQuoteResponse(payload)) {
        throw new BadGatewayException(
          'Finnhub returned an unexpected quote response.',
        );
      }

      if (this.isInvalidQuoteResponse(payload)) {
        throw new BadRequestException(
          `Invalid or unsupported stock symbol: ${normalizedSymbol}.`,
        );
      }

      return this.mapQuote(normalizedSymbol, payload);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('Finnhub request timed out.');
      }

      throw new ServiceUnavailableException('Unable to reach Finnhub.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeSymbol(symbol: string): string {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      throw new BadRequestException('Stock symbol is required.');
    }

    return normalizedSymbol;
  }

  private mapQuote(symbol: string, quote: FinnhubQuoteResponse): StockQuote {
    return {
      symbol,
      currentPrice: quote.c,
      change: quote.d,
      percentChange: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previousClose: quote.pc,
      fetchedAt: new Date().toISOString(),
      sourceTimestamp:
        quote.t > 0 ? new Date(quote.t * 1000).toISOString() : null,
    };
  }

  private isInvalidQuoteResponse(quote: FinnhubQuoteResponse): boolean {
    return (
      quote.c === 0 &&
      quote.d === 0 &&
      quote.dp === 0 &&
      quote.h === 0 &&
      quote.l === 0 &&
      quote.o === 0 &&
      quote.pc === 0 &&
      quote.t === 0
    );
  }

  private isFinnhubErrorResponse(
    payload: unknown,
  ): payload is FinnhubErrorResponse {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    return typeof (payload as FinnhubErrorResponse).error === 'string';
  }

  private isFinnhubQuoteResponse(
    payload: unknown,
  ): payload is FinnhubQuoteResponse {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const quote = payload as Record<string, unknown>;

    return ['c', 'd', 'dp', 'h', 'l', 'o', 'pc', 't'].every(
      (key) => typeof quote[key] === 'number',
    );
  }
}
