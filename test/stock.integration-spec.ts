import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FinnhubService } from '../src/finnhub/finnhub.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StockIngestionService } from '../src/stock/stock-ingestion.service';
import { StockService } from '../src/stock/stock.service';

describe('Stock integration', () => {
  let prismaService: PrismaService;
  let stockService: StockService;
  let stockIngestionService: StockIngestionService;

  const finnhubServiceMock = {
    validateSymbol: jest.fn(),
    getQuote: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      return process.env[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value = process.env[key];

      if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
      }

      return value;
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        StockService,
        StockIngestionService,
        {
          provide: FinnhubService,
          useValue: finnhubServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    prismaService = moduleRef.get(PrismaService);
    stockService = moduleRef.get(StockService);
    stockIngestionService = moduleRef.get(StockIngestionService);

    await prismaService.$connect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prismaService.stockPrice.deleteMany();
    await prismaService.trackedSymbol.deleteMany();
  });

  afterAll(async () => {
    await prismaService.stockPrice.deleteMany();
    await prismaService.trackedSymbol.deleteMany();
    await prismaService.$disconnect();
  });

  it('persists tracked symbols through the start tracking flow', async () => {
    finnhubServiceMock.validateSymbol.mockResolvedValue(undefined);
    finnhubServiceMock.getQuote.mockResolvedValue({
      symbol: 'AAPL',
      currentPrice: 185.12,
      change: 1.4,
      percentChange: 0.76,
      high: 186.2,
      low: 183.7,
      open: 184.1,
      previousClose: 183.72,
      fetchedAt: '2024-04-05T10:00:00.000Z',
      sourceTimestamp: '2024-04-05T13:20:00.000Z',
    });

    const result = await stockService.startTracking('aapl');
    const trackedSymbol = await prismaService.trackedSymbol.findUnique({
      where: {
        symbol: 'AAPL',
      },
    });

    expect(result.symbol).toBe('AAPL');
    expect(trackedSymbol).not.toBeNull();
    expect(trackedSymbol?.isActive).toBe(true);
  });

  it('stores ingested prices and exposes them through the read model', async () => {
    const trackedSymbol = await prismaService.trackedSymbol.create({
      data: {
        symbol: 'AAPL',
        isActive: true,
      },
    });

    finnhubServiceMock.getQuote.mockResolvedValue({
      symbol: 'AAPL',
      currentPrice: 110,
      change: 1,
      percentChange: 0.5,
      high: 111,
      low: 109,
      open: 109.5,
      previousClose: 109,
      fetchedAt: '2024-04-05T10:00:00.000Z',
      sourceTimestamp: '2024-04-05T10:00:00.000Z',
    });

    for (let index = 0; index < 10; index += 1) {
      finnhubServiceMock.getQuote.mockResolvedValueOnce({
        symbol: 'AAPL',
        currentPrice: 101 + index,
        change: 1,
        percentChange: 0.5,
        high: 111,
        low: 109,
        open: 109.5,
        previousClose: 109,
        fetchedAt: '2024-04-05T10:00:00.000Z',
        sourceTimestamp: `2024-04-05T10:0${index}:00.000Z`,
      });

      await stockIngestionService.ingestTrackedSymbol(trackedSymbol.id, 'AAPL');
    }

    const result = await stockService.getStock('AAPL');

    expect(result.symbol).toBe('AAPL');
    expect(result.currentPrice).toBe(110);
    expect(result.sampleCount).toBe(10);
    expect(result.movingAverage10).toBe(105.5);
    expect(result.status).toBe('ACTIVE');
  });
});
