import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetStockResponseDto } from './dto/get-stock-response.dto';
import { StartTrackingResponseDto } from './dto/start-tracking-response.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async getStock(symbol: string): Promise<GetStockResponseDto> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const trackedSymbol = await this.prismaService.trackedSymbol.findUnique({
      where: {
        symbol: normalizedSymbol,
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

    if (!trackedSymbol) {
      throw new NotFoundException(
        `No tracking configuration found for symbol: ${normalizedSymbol}.`,
      );
    }

    const latestPrice = trackedSymbol.prices[0] ?? null;
    const sampleCount = trackedSymbol.prices.length;

    return {
      symbol: trackedSymbol.symbol,
      currentPrice: latestPrice ? Number(latestPrice.price) : null,
      lastUpdatedAt: latestPrice ? latestPrice.fetchedAt.toISOString() : null,
      movingAverage10:
        sampleCount >= 10
          ? this.calculateMovingAverage(trackedSymbol.prices)
          : null,
      sampleCount,
      trackingActive: trackedSymbol.isActive,
      status: latestPrice ? 'ACTIVE' : 'PENDING_FIRST_FETCH',
    };
  }

  async startTracking(symbol: string): Promise<StartTrackingResponseDto> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    await this.finnhubService.validateSymbol(normalizedSymbol);
    await this.finnhubService.getQuote(normalizedSymbol);

    const trackedSymbol = await this.prismaService.trackedSymbol.upsert({
      where: {
        symbol: normalizedSymbol,
      },
      create: {
        symbol: normalizedSymbol,
        isActive: true,
      },
      update: {
        isActive: true,
        lastError: null,
      },
    });

    return {
      symbol: trackedSymbol.symbol,
      trackingActive: trackedSymbol.isActive,
      startedAt: trackedSymbol.startedAt.toISOString(),
    };
  }

  private calculateMovingAverage(
    prices: Array<{ price: number | string | { toString(): string } }>,
  ): number {
    const total = prices.reduce((sum, priceRecord) => {
      return sum + Number(priceRecord.price);
    }, 0);

    return Number((total / 10).toFixed(4));
  }

  private normalizeSymbol(symbol: string): string {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      throw new BadRequestException('Stock symbol is required.');
    }

    return normalizedSymbol;
  }
}
