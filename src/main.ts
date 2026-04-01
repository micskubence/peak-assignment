import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './docs/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  setupSwagger(app);

  await app.listen(port);

  Logger.log(`Application is running on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger documentation is available at /docs`, 'Bootstrap');
}
bootstrap();
