import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  const prismaService = {
    getDatabaseHealth: jest.fn().mockResolvedValue({
      status: 'not_configured',
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: 'degraded',
            environment: 'test',
            database: expect.objectContaining({
              status: 'not_configured',
            }),
          }),
        );
        expect(body.timestamp).toEqual(expect.any(String));
        expect(body.uptimeSeconds).toEqual(expect.any(Number));
      });
  });
});
