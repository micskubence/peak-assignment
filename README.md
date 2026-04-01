# Peak Assignment

Foundation stage for the stock price checker assignment.

Current scope:
- NestJS 11 baseline
- local PostgreSQL via Docker Compose
- Prisma setup with PostgreSQL datasource
- environment validation with `@nestjs/config` and `joi`
- technical health endpoint at `GET /health`
- Finnhub integration service for stock quote fetching
- stock tracking registration endpoint at `PUT /stock/:symbol`
- scheduled stock price ingestion for active tracked symbols
- read model endpoint at `GET /stock/:symbol` with 10-sample moving average

## Requirements

- Node `22.13.1+`
- npm `10+`
- Docker and Docker Compose

## Local development

1. Create a local env file:

```bash
cp .env.example .env
```

2. Add your Finnhub API key to `.env`.

3. Start PostgreSQL in Docker:

```bash
npm run db:up
```

4. Apply the local Prisma migration:

```bash
npm run prisma:migrate:dev
```

5. Generate the Prisma client:

```bash
npm run prisma:generate
```

6. Start the Nest app on the host machine:

```bash
npm run start:dev
```

7. Verify the technical health endpoint:

```bash
curl http://localhost:3000/health
```

Expected behavior:
- app responds with JSON
- `database.status` should become `up` when the local PostgreSQL container is reachable
- Finnhub-backed features will require `FINNHUB_API_KEY`
- `PUT /stock/:symbol` should start tracking for a validated symbol
- the scheduler now runs every minute and stores price snapshots for active symbols
- `GET /stock/:symbol` returns the latest stored price and moving average for the last 10 samples

## Useful commands

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run lint
npm run prisma:migrate:dev
npm run prisma:studio
npm run db:down
```

## Docker notes

- `docker-compose.yml` is for local development and starts PostgreSQL only
- `Dockerfile` is for building and running the Nest application image
- in production, the app should receive its `DATABASE_URL` from the deployment environment instead of relying on the local compose setup
