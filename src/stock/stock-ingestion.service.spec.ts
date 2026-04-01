import { Test } from '@nestjs/testing';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockIngestionService } from './stock-ingestion.service';

describe('StockIngestionService', () => {
  let service: StockIngestionService;

  const prismaServiceMock = {
    trackedSymbol: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    stockPrice: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const finnhubServiceMock = {
    getQuote: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaServiceMock.$transaction.mockImplementation(
      async (operations: unknown[]) => Promise.all(operations),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockIngestionService,
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

    service = moduleRef.get(StockIngestionService);
  });

  it('ingests all active tracked symbols', async () => {
    prismaServiceMock.trackedSymbol.findMany.mockResolvedValue([
      { id: 'symbol-1', symbol: 'AAPL' },
      { id: 'symbol-2', symbol: 'MSFT' },
    ]);

    const ingestTrackedSymbolSpy = jest
      .spyOn(service, 'ingestTrackedSymbol')
      .mockResolvedValue();

    await service.ingestActiveSymbols();

    expect(prismaServiceMock.trackedSymbol.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        symbol: true,
      },
      orderBy: {
        symbol: 'asc',
      },
    });
    expect(ingestTrackedSymbolSpy).toHaveBeenNthCalledWith(
      1,
      'symbol-1',
      'AAPL',
    );
    expect(ingestTrackedSymbolSpy).toHaveBeenNthCalledWith(
      2,
      'symbol-2',
      'MSFT',
    );
  });

  it('stores a stock price and clears the last error on success', async () => {
    finnhubServiceMock.getQuote.mockResolvedValue({
      symbol: 'AAPL',
      currentPrice: 185.12,
      sourceTimestamp: '2024-04-05T13:20:00.000Z',
    });

    prismaServiceMock.stockPrice.create.mockResolvedValue({ id: 'price-1' });
    prismaServiceMock.trackedSymbol.update.mockResolvedValue({
      id: 'symbol-1',
    });

    await service.ingestTrackedSymbol('symbol-1', 'AAPL');

    expect(finnhubServiceMock.getQuote).toHaveBeenCalledWith('AAPL');
    expect(prismaServiceMock.stockPrice.create).toHaveBeenCalledWith({
      data: {
        trackedSymbolId: 'symbol-1',
        price: 185.12,
        sourceTimestamp: new Date('2024-04-05T13:20:00.000Z'),
      },
    });
    expect(prismaServiceMock.trackedSymbol.update).toHaveBeenCalledWith({
      where: {
        id: 'symbol-1',
      },
      data: {
        lastFetchedAt: expect.any(Date),
        lastError: null,
      },
    });
    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('stores the last error when ingestion fails', async () => {
    finnhubServiceMock.getQuote.mockRejectedValue(
      new Error('Finnhub request timed out.'),
    );

    prismaServiceMock.trackedSymbol.update.mockResolvedValue({
      id: 'symbol-1',
    });

    await service.ingestTrackedSymbol('symbol-1', 'AAPL');

    expect(prismaServiceMock.stockPrice.create).not.toHaveBeenCalled();
    expect(prismaServiceMock.trackedSymbol.update).toHaveBeenCalledWith({
      where: {
        id: 'symbol-1',
      },
      data: {
        lastError: 'Finnhub request timed out.',
      },
    });
  });
});
