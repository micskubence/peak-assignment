import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localFallbackDatabaseUrl =
  'postgresql://postgres:postgres@localhost:5432/peak_assignment?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? localFallbackDatabaseUrl,
  },
});
