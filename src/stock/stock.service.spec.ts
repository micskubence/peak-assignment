import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;

  const prismaServiceMock = {
    trackedSymbol: {
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
});
