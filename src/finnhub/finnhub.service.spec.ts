import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { FinnhubService } from './finnhub.service';

describe('FinnhubService', () => {
  let service: FinnhubService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FinnhubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'FINNHUB_API_KEY' ? 'test-finnhub-key' : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(FinnhubService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a normalized stock quote', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        c: 185.12,
        d: 1.4,
        dp: 0.76,
        h: 186.2,
        l: 183.7,
        o: 184.1,
        pc: 183.72,
        t: 1712323200,
      }),
      status: 200,
    });

    const quote = await service.getQuote(' aapl ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('symbol=AAPL');
    expect(quote.symbol).toBe('AAPL');
    expect(quote.currentPrice).toBe(185.12);
    expect(quote.sourceTimestamp).toBe('2024-04-05T13:20:00.000Z');
  });

  it('accepts an exact Finnhub symbol search match', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        result: [
          {
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            symbol: 'AAPL',
            type: 'Common Stock',
          },
        ],
      }),
      status: 200,
    });

    await expect(service.validateSymbol(' aapl ')).resolves.toBeUndefined();
  });

  it('rejects a symbol without an exact Finnhub search match', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 0,
        result: [],
      }),
      status: 200,
    });

    await expect(service.validateSymbol('AAPLAPL')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when the symbol is empty', async () => {
    await expect(service.getQuote('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when the API key is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FinnhubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const missingKeyService = moduleRef.get(FinnhubService);

    await expect(missingKeyService.getQuote('AAPL')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('throws when Finnhub returns an invalid symbol payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        c: 0,
        d: 0,
        dp: 0,
        h: 0,
        l: 0,
        o: 0,
        pc: 0,
        t: 0,
      }),
      status: 200,
    });

    await expect(service.getQuote('INVALID')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when Finnhub returns a non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
      status: 429,
    });

    await expect(service.getQuote('AAPL')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws when Finnhub returns an upstream error payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        error: 'Symbol not supported',
      }),
      status: 200,
    });

    await expect(service.getQuote('AAPL')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws when Finnhub is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.getQuote('AAPL')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
