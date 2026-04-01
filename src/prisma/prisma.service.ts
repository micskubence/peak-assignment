import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

type DatabaseHealthStatus = 'up' | 'down' | 'not_configured';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({
      adapter,
    });

    this.configService = configService;
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (!databaseUrl || nodeEnv === 'test') {
      return;
    }

    try {
      await this.$connect();
      this.logger.log('Database connection established.');
    } catch (error) {
      this.logger.warn(
        `Database connection unavailable at startup: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      return;
    }

    await this.$disconnect();
  }

  async getDatabaseHealth(): Promise<{
    status: DatabaseHealthStatus;
    detail?: string;
  }> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      return {
        status: 'not_configured',
        detail: 'DATABASE_URL is not configured.',
      };
    }

    try {
      await this.$queryRawUnsafe('SELECT 1');

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        detail: this.getErrorMessage(error),
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown database error';
  }
}
