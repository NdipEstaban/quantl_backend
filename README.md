# Quantl Trading Journal API

Quantl is a backend API for a trading journal and account analytics platform. It is built with NestJS and TypeScript, stores application and trading data in PostgreSQL through Prisma, and integrates with a MetaTrader service to connect accounts and synchronize trading activity.

The API provides account and trade data that a client application can use to review performance, understand trading habits, and keep a journal of strategy and execution notes.

## Highlights

- **Account and authentication services** — registration, email verification, password login, token refresh, logout, password recovery, and Google and Facebook OAuth flows.
- **Trading account management** — connect, update, disconnect, and manually synchronize trading accounts.
- **MetaTrader integration** — an HTTP integration with a separately hosted MetaTrader service for account, order, position, and trade-history operations.
- **Trading analytics** — account vitals, equity growth, daily activity, profit distribution, streaks, holding time, consistency, and other metrics.
- **Automated synchronization** — scheduled account synchronization for configured intervals, from every five minutes through daily.
- **Journal and playbook data model** — structured trade notes, ratings, emotional state, mistakes, tags, images, and strategy playbooks.
- **API documentation** — interactive Swagger UI generated from the NestJS API.
- **Performance and validation** — request validation, response caching, and cache invalidation for account changes.

> This repository contains the backend service. A PostgreSQL database is required. MetaTrader connectivity, email delivery, Redis caching, and OAuth providers require their corresponding external services and credentials.

## Technology

- [NestJS](https://nestjs.com/) 11 and TypeScript
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/) 7 with the PostgreSQL driver adapter
- [Redis](https://redis.io/) and an in-memory cache
- Passport strategies for local authentication, JWT, Google, and Facebook
- Swagger / OpenAPI
- Jest and Supertest

## Requirements

- Node.js 20 or later
- npm
- PostgreSQL
- Redis
- A running MetaTrader integration service for account and trade synchronization

An SMTP account is needed for email verification and password recovery. OAuth credentials are needed only if you plan to enable the corresponding sign-in providers.

## Getting started

### 1. Install dependencies

From the project directory:

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root. Do not commit this file or put real credentials in examples, screenshots, or issue reports.

```dotenv
# Application
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/quantl?schema=public

# Authentication (use long, unique, random secrets)
JWT_SECRET=replace-with-a-long-random-secret
REFRESH_JWT_SECRET=replace-with-a-different-long-random-secret

# MetaTrader integration service
MT5_SERVICE_URL=http://localhost:8000/api
MT5_API_KEY=replace-with-your-integration-service-api-key

# Redis
REDIS_URL=redis://localhost:6379/0

# SMTP email delivery
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM_NAME=Quantl
EMAIL_FROM_ADDRESS=no-reply@example.com

# Optional Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Optional Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

# Encryption key for stored trading-account credentials
PASSWORD_ENCRYPTION_KEY=replace-with-a-unique-secret
```

Use the variable names expected by the configured provider, and set the OAuth callback URLs to the URLs registered with Google or Facebook. Keep production secrets in your deployment platform's secret manager rather than in a committed file.

### 3. Generate Prisma Client and apply migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies the checked-in migrations to the database configured by `DATABASE_URL`. For local schema development, use the Prisma migration workflow appropriate to your change and commit the resulting migration.

### 4. Run the API

```bash
# Development with file watching
npm run start:dev

# Production build and start
npm run build
npm run start:prod
```

The API listens on `http://localhost:3000` by default. Set `PORT` to change the port. Interactive API documentation is available at:

```text
http://localhost:3000/docs
```

There is no global `/api` route prefix currently enabled. Routes are served from their documented controller paths, such as `/auth` and `/metrics`.

## API overview

Swagger UI at `/docs` is the source of truth for request schemas, parameters, responses, and authorization requirements. The main route groups include:

| Route group | Examples | Purpose |
| --- | --- | --- |
| `/auth` | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/profile` | Account access, tokens, email verification, password recovery, and OAuth |
| `/trade-accounts` | `GET /trade-accounts/connected`, `POST /trade-accounts/connect/mt5`, `POST /trade-accounts/:accountId/sync` | Connect and manage trading accounts and synchronize their data |
| `/metrics` | `GET /metrics/vitals`, `GET /metrics/equity-growth`, `GET /metrics/summary` | Trading performance and activity analytics |
| `/metatrader` | `GET /metatrader/health`, `GET /metatrader/account/info`, `GET /metatrader/trade/history` | Integration-service health and MetaTrader account/trade operations |

Authentication uses access and refresh tokens. The Swagger UI includes bearer authentication where configured. Some OAuth callbacks use HTTP-only cookies; production deployments should use HTTPS and configure trusted callback URLs and CORS origins for the client application.

## Data and synchronization

Prisma models cover users and sessions, trading accounts, deals, orders, positions, journaled trades, playbooks, verification tokens, audit logs, subscriptions, and payments. Trading data is associated with trading accounts and includes platform-specific metadata where needed.

The account synchronization scheduler processes accounts configured for these frequencies:

- Every 5, 15, or 30 minutes
- Every 1 or 4 hours
- Daily

The scheduler runs within the API process. If you run multiple API replicas, account for that when deploying so scheduled work is not unintentionally duplicated.

## Useful commands

```bash
npm run start:dev    # Start the development server
npm run build        # Compile the application
npm run start:prod   # Start the compiled application
npm run lint         # Run ESLint (this script applies fixes)
npm run format       # Format source and test files
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:cov     # Run tests with coverage
```

## Project structure

```text
src/
  auth/             Authentication, Passport strategies, and token flows
  cache/            Cache service, decorators, and invalidation
  common/           Shared filters, interceptors, and scheduled jobs
  config/           Application and integration configuration
  email/            Email delivery and templates
  metatrader/       HTTP client and routes for the MetaTrader service
  metrics/          Trading analytics endpoints and calculations
  trading-account/  Trading account management and synchronization
  user/             User-related services and routes
  prisma.service.ts Prisma client and PostgreSQL adapter
prisma/
  schema.prisma     Database models and enums
  migrations/       Versioned database migrations
test/               End-to-end tests
```

## Security notes

- Never commit `.env` files, access tokens, OAuth secrets, SMTP credentials, database URLs, or trading-account credentials.
- Set unique, high-entropy JWT and encryption secrets before running outside local development.
- Use HTTPS in production and restrict `CORS_ORIGIN` to trusted client origins.
- Use read-only or investor credentials for trading integrations wherever the platform supports them.
- Do not expose the API or MetaTrader integration service publicly without reviewing authentication, authorization, network access, and secret management for your deployment.

## Contributing

Contributions are welcome. Before opening a pull request, please run the relevant tests and describe the behavior changed. For database changes, include the Prisma migration and update any related documentation.

## License

No open-source license is currently specified in this repository. Unless a license is added, standard copyright restrictions apply; check with the project owner before reusing or redistributing the code.
