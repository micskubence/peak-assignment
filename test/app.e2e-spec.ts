import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FinnhubService } from '../src/finnhub/finnhub.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const prismaServiceMock = {
    getDatabaseHealth: jest.fn().mockResolvedValue({
      status: 'not_configured',
      detail: 'DATABASE_URL is not configured.',
    }),
    trackedSymbol: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        isActive: true,
        startedAt: new Date('2024-04-05T10:00:00.000Z'),
      }),
    },
  };

  const finnhubServiceMock = {
    validateSymbol: jest.fn().mockResolvedValue(undefined),
    getQuote: jest.fn().mockResolvedValue({
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
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaServiceMock)
      .overrideProvider(FinnhubService)
      .useValue(finnhubServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('degraded');
    expect(response.body.database.status).toBe('not_configured');
  });

  it('/stock/:symbol (PUT)', async () => {
    const response = await request(app.getHttpServer()).put('/stock/aapl');

    expect(response.status).toBe(200);
    expect(finnhubServiceMock.validateSymbol).toHaveBeenCalledWith('AAPL');
    expect(finnhubServiceMock.getQuote).toHaveBeenCalledWith('AAPL');
    expect(prismaServiceMock.trackedSymbol.upsert).toHaveBeenCalledWith({
      where: { symbol: 'AAPL' },
      create: {
        symbol: 'AAPL',
        isActive: true,
      },
      update: {
        isActive: true,
        lastError: null,
      },
    });
    expect(response.body).toEqual({
      symbol: 'AAPL',
      trackingActive: true,
      startedAt: '2024-04-05T10:00:00.000Z',
    });
  });

  it('/stock/:symbol (GET)', async () => {
    prismaServiceMock.trackedSymbol.findUnique.mockResolvedValue({
      symbol: 'AAPL',
      isActive: true,
      prices: [
        {
          price: '110.0000',
          fetchedAt: new Date('2024-04-05T10:09:00.000Z'),
        },
        {
          price: '109.0000',
          fetchedAt: new Date('2024-04-05T10:08:00.000Z'),
        },
        {
          price: '108.0000',
          fetchedAt: new Date('2024-04-05T10:07:00.000Z'),
        },
        {
          price: '107.0000',
          fetchedAt: new Date('2024-04-05T10:06:00.000Z'),
        },
        {
          price: '106.0000',
          fetchedAt: new Date('2024-04-05T10:05:00.000Z'),
        },
        {
          price: '105.0000',
          fetchedAt: new Date('2024-04-05T10:04:00.000Z'),
        },
        {
          price: '104.0000',
          fetchedAt: new Date('2024-04-05T10:03:00.000Z'),
        },
        {
          price: '103.0000',
          fetchedAt: new Date('2024-04-05T10:02:00.000Z'),
        },
        {
          price: '102.0000',
          fetchedAt: new Date('2024-04-05T10:01:00.000Z'),
        },
        {
          price: '101.0000',
          fetchedAt: new Date('2024-04-05T10:00:00.000Z'),
        },
      ],
    });

    const response = await request(app.getHttpServer()).get('/stock/aapl');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      symbol: 'AAPL',
      currentPrice: 110,
      lastUpdatedAt: '2024-04-05T10:09:00.000Z',
      movingAverage10: 105.5,
      sampleCount: 10,
      trackingActive: true,
      status: 'ACTIVE',
    });
  });
});
