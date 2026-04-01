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
  FinnhubSymbolSearchResponse,
  StockQuote,
} from './finnhub.types';

const FINNHUB_QUOTE_URL = 'https://finnhub.io/api/v1/quote';
const FINNHUB_SEARCH_URL = 'https://finnhub.io/api/v1/search';
const FINNHUB_TIMEOUT_MS = 10_000;

@Injectable()
export class FinnhubService {
  constructor(private readonly configService: ConfigService) {}

  async validateSymbol(symbol: string): Promise<void> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const apiKey = this.configService.get<string>('FINNHUB_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'FINNHUB_API_KEY is not configured.',
      );
    }

    const payload = await this.fetchJson(
      this.buildRequestUrl(FINNHUB_SEARCH_URL, normalizedSymbol, apiKey, 'q'),
    );

    if (!this.isFinnhubSymbolSearchResponse(payload)) {
      throw new BadGatewayException(
        'Finnhub returned an unexpected symbol search response.',
      );
    }

    const hasExactMatch = payload.result.some(
      (result) =>
        result.symbol.toUpperCase() === normalizedSymbol ||
        result.displaySymbol.toUpperCase() === normalizedSymbol,
    );

    if (!hasExactMatch) {
      throw new BadRequestException(
        `Invalid or unsupported stock symbol: ${normalizedSymbol}.`,
      );
    }
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const apiKey = this.configService.get<string>('FINNHUB_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'FINNHUB_API_KEY is not configured.',
      );
    }

    try {
      const payload = await this.fetchJson(
        this.buildRequestUrl(FINNHUB_QUOTE_URL, normalizedSymbol, apiKey),
      );

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

      throw new ServiceUnavailableException(
        `Unable to reach Finnhub: ${this.getErrorMessage(error)}`,
      );
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

  private isFinnhubSymbolSearchResponse(
    payload: unknown,
  ): payload is FinnhubSymbolSearchResponse {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const searchResponse = payload as Record<string, unknown>;

    return (
      typeof searchResponse.count === 'number' &&
      Array.isArray(searchResponse.result)
    );
  }

  private buildRequestUrl(
    baseUrl: string,
    symbol: string,
    apiKey: string,
    symbolParamName = 'symbol',
  ): URL {
    const requestUrl = new URL(baseUrl);

    requestUrl.searchParams.set(symbolParamName, symbol);
    requestUrl.searchParams.set('token', apiKey);

    return requestUrl;
  }

  private async fetchJson(requestUrl: URL): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FINNHUB_TIMEOUT_MS);

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

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Finnhub error';
  }
}
