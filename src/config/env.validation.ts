import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  POSTGRES_DB: Joi.string().default('peak_assignment'),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().default('postgres'),
  POSTGRES_PORT: Joi.number().port().default(5432),
  DATABASE_URL: Joi.alternatives().conditional('NODE_ENV', {
    is: 'test',
    then: Joi.string()
      .uri({ scheme: ['postgresql'] })
      .optional(),
    otherwise: Joi.string()
      .uri({ scheme: ['postgresql'] })
      .required(),
  }),
});
