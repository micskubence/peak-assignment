import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const healthService = {
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return the health payload', async () => {
    const expected = {
      status: 'ok',
      environment: 'test',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 1,
      database: {
        status: 'up',
      },
    };

    healthService.getHealth.mockResolvedValue(expected);

    await expect(controller.getHealth()).resolves.toEqual(expected);
  });
});
