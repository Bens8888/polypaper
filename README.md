# PaperMarket

PaperMarket is a full-stack paper-trading prediction market built with Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth, React Query, Recharts, and Docker.

Everything in the app is simulated:

- No real money
- No crypto wallets
- No blockchain signing
- Every new account starts with exactly `$100.00` in paper cash

## What is included

- Premium dark landing page and trader-style shell
- Email/password authentication with hashed passwords and sessions
- Dashboard, markets, market detail, portfolio, activity, leaderboard, settings, and admin pages
- Prisma schema with migrations and seed script
- Paper-trading engine with buy/sell logic, cash checks, fees, slippage, PnL, and settlement
- Market data provider abstraction with live-mode support and automatic mock fallback
- Dockerfile, Docker Compose, and VPS-ready deployment flow

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn-style UI primitives
- Prisma ORM 7
- PostgreSQL
- NextAuth credentials auth
- React Query
- Recharts
- Zod
- Docker / Docker Compose

## Data provider model

PaperMarket uses a provider abstraction:

- `LiveProvider`: fetches from the configured `LIVE_MARKET_API_URL`
- `MockProvider`: generates realistic fallback pricing when live data is unavailable
- `syncMarketData()`: retries live fetches and automatically falls back without breaking the app

If you do not want to use a live feed, set:

```env
MARKET_DATA_PROVIDER=mock
```

## Local development

1. Copy the env file:

```bash
cp .env.example .env
```

2. Update the values you want. For local development you can use:

```env
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://papermarket:papermarket@localhost:5432/papermarket?schema=public
```

3. Start PostgreSQL locally with Docker:

```bash
docker compose up -d db
```

4. Install dependencies and apply migrations:

```bash
npm install
npx prisma migrate deploy
npm run seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seeded accounts

The seed script creates:

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Demo: `DEMO_EMAIL` / `DEMO_PASSWORD`

Defaults are defined in `.env.example`.

## VPS deployment on Ubuntu with no domain

This project is designed to run directly on a VPS IP using Docker and Docker Compose.

### 1. Install Docker

Install Docker Engine and Docker Compose plugin on Ubuntu.

### 2. Clone the project

```bash
git clone <your-repo-url> papermarket
cd papermarket
```

### 3. Create your env file

```bash
cp .env.example .env
```

Update these values:

- `NEXTAUTH_URL=http://SERVER_IP`
- `APP_URL=http://SERVER_IP`
- `NEXTAUTH_SECRET=<long-random-secret>`
- `POSTGRES_PASSWORD=<strong-password>`
- Any optional live provider settings

### 4. Start the app

```bash
docker compose up -d --build
```

The app will:

- build the Next.js image
- start PostgreSQL
- run `prisma migrate deploy`
- run the seed script
- start Next.js on port `3000`
- expose the site on `http://SERVER_IP` through `80:3000`

### 5. Open the app

Visit:

```text
http://SERVER_IP
```

No domain or Nginx is required.

## Update / redeploy workflow

Use the exact workflow below after pushing new code:

```bash
git pull
docker compose up -d --build
```

Containers use `restart: unless-stopped`, so they automatically restart after reboot or failure.

## Key scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run seed
```

## Paper trading engine notes

- Buy YES / NO
- Sell existing positions only
- No negative balances
- No leverage
- Realized and unrealized PnL tracked separately
- Winning shares settle to `$1.00`, losing shares to `$0.00`
- Fees and slippage are configurable through env

## Project structure

```text
src/app                Next.js routes and layouts
src/components         UI, layout, charts, auth, markets, settings, admin
src/lib                config, auth, formatting, client utilities
src/server             providers, sync service, portfolio, trading, queries
prisma                 schema, migrations, seed
Dockerfile             production image
docker-compose.yml     VPS deployment stack
```

## Deployment notes

- Port mapping is `80 -> 3000`
- PostgreSQL data persists in the `postgres_data` Docker volume
- Market sync uses fallback mode automatically if the live provider fails
- The admin page can manually trigger a sync after deploy
