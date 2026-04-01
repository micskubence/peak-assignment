import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;

  const prismaServiceMock = {
    trackedSymbol: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const finnhubServiceMock = {
    validateSymbol: jest.fn(),
    getQuote: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: FinnhubService,
          useValue: finnhubServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(StockService);
  });

  it('creates or reactivates tracking for a normalized symbol', async () => {
    finnhubServiceMock.validateSymbol.mockResolvedValue(undefined);
    finnhubServiceMock.getQuote.mockResolvedValue({
      symbol: 'AAPL',
      currentPrice: 185.12,
    });

    prismaServiceMock.trackedSymbol.upsert.mockResolvedValue({
      symbol: 'AAPL',
      isActive: true,
      startedAt: new Date('2024-04-05T10:00:00.000Z'),
    });

    const result = await service.startTracking(' aapl ');

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
    expect(result).toEqual({
      symbol: 'AAPL',
      trackingActive: true,
      startedAt: '2024-04-05T10:00:00.000Z',
    });
  });

  it('throws when the symbol is empty', async () => {
    await expect(service.startTracking('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns pending status when no prices have been fetched yet', async () => {
    prismaServiceMock.trackedSymbol.findUnique.mockResolvedValue({
      symbol: 'AAPL',
      isActive: true,
      prices: [],
    });

    const result = await service.getStock('aapl');

    expect(prismaServiceMock.trackedSymbol.findUnique).toHaveBeenCalledWith({
      where: {
        symbol: 'AAPL',
      },
      include: {
        prices: {
          orderBy: {
            fetchedAt: 'desc',
          },
          take: 10,
        },
      },
    });
    expect(result).toEqual({
      symbol: 'AAPL',
      currentPrice: null,
      lastUpdatedAt: null,
      movingAverage10: null,
      sampleCount: 0,
      trackingActive: true,
      status: 'PENDING_FIRST_FETCH',
    });
  });

  it('returns the latest price and moving average when 10 samples are available', async () => {
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

    const result = await service.getStock('AAPL');

    expect(result).toEqual({
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
