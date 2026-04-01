import { BadRequestException, Injectable } from '@nestjs/common';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';
import { StartTrackingResponseDto } from './dto/start-tracking-response.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async startTracking(symbol: string): Promise<StartTrackingResponseDto> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

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

  private normalizeSymbol(symbol: string): string {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      throw new BadRequestException('Stock symbol is required.');
    }

    return normalizedSymbol;
  }
}
