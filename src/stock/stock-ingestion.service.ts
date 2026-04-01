import { Injectable, Logger } from '@nestjs/common';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockIngestionService {
  private readonly logger = new Logger(StockIngestionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async ingestActiveSymbols(): Promise<void> {
    const trackedSymbols = await this.prismaService.trackedSymbol.findMany({
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

    for (const trackedSymbol of trackedSymbols) {
      await this.ingestTrackedSymbol(trackedSymbol.id, trackedSymbol.symbol);
    }
  }

  async ingestTrackedSymbol(
    trackedSymbolId: string,
    symbol: string,
  ): Promise<void> {
    try {
      const quote = await this.finnhubService.getQuote(symbol);

      await this.prismaService.$transaction([
        this.prismaService.stockPrice.create({
          data: {
            trackedSymbolId,
            price: quote.currentPrice,
            sourceTimestamp: quote.sourceTimestamp
              ? new Date(quote.sourceTimestamp)
              : null,
          },
        }),
        this.prismaService.trackedSymbol.update({
          where: {
            id: trackedSymbolId,
          },
          data: {
            lastFetchedAt: new Date(),
            lastError: null,
          },
        }),
      ]);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);

      this.logger.warn(`Price ingestion failed for ${symbol}: ${errorMessage}`);

      await this.prismaService.trackedSymbol.update({
        where: {
          id: trackedSymbolId,
        },
        data: {
          lastError: errorMessage,
        },
      });
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown stock ingestion error';
  }
}
