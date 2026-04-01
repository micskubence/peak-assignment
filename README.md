# Peak Assignment

Foundation stage for the stock price checker assignment.

Current scope:
- NestJS 11 baseline
- local PostgreSQL via Docker Compose
- Prisma setup with PostgreSQL datasource
- environment validation with `@nestjs/config` and `joi`
- technical health endpoint at `GET /health`
- Finnhub integration service for stock quote fetching

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

4. Generate the Prisma client:

```bash
npm run prisma:generate
```

5. Start the Nest app on the host machine:

```bash
npm run start:dev
```

6. Verify the technical health endpoint:

```bash
curl http://localhost:3000/health
```

Expected behavior:
- app responds with JSON
- `database.status` should become `up` when the local PostgreSQL container is reachable
- Finnhub-backed features will require `FINNHUB_API_KEY`

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
