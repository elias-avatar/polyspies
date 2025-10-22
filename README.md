# PolyGuild - Prediction Market Analytics & Arbitrage

A comprehensive analytics platform for finding arbitrage opportunities and tracking traders across Polymarket and Kalshi prediction markets.

## Features

- 🔍 **Arbitrage Detection** - Automatically find profitable price differences between Polymarket and Kalshi
- 📊 **Market Analytics** - Real-time market data from both platforms in one place
- 👥 **Trader Tracking** - Follow and analyze top traders (coming soon)
- 🎯 **Smart Matching** - Intelligent market matching across platforms
- 📈 **Live Stats** - Real-time statistics on arbitrage opportunities

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL with Prisma ORM
- **APIs**: Polymarket Gamma API, Kalshi REST API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use Vercel Postgres)
- (Optional) Kalshi API credentials for extended features

### Installation

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd polyguild
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and add your database URL:
\`\`\`
DATABASE_URL="postgresql://user:password@localhost:5432/polyguild"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional Kalshi API credentials
KALSHI_API_KEY=""
KALSHI_PRIVATE_KEY=""

# Optional for cron job authentication
CRON_SECRET="your-cron-secret"
\`\`\`

4. Set up the database:
\`\`\`bash
npx prisma migrate dev
npx prisma generate
\`\`\`

5. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

### Finding Arbitrage Opportunities

1. Navigate to the Arbitrage page
2. Click "Scan Now" to manually trigger a scan
3. Filter opportunities by minimum gap percentage
4. Click on platform links to execute trades

### Browsing Markets

1. Go to the Markets page
2. Filter by platform (All, Polymarket, or Kalshi)
3. View market details including prices, volume, and liquidity
4. Click to trade on the original platform

## API Routes

### Markets

- `GET /api/markets` - Fetch markets with filters
  - Query params: `platform`, `limit`, `search`, `category`
- `GET /api/markets/[platform]/[id]` - Get specific market details

### Arbitrage

- `GET /api/arbitrage` - Fetch active arbitrage opportunities
  - Query params: `minGap`, `sortBy`, `limit`
- `POST /api/arbitrage/scan` - Trigger manual arbitrage scan

### Cron Jobs

- `GET /api/cron/scan-arbitrage` - Automated scan (runs every 5 minutes on Vercel)

## Project Structure

\`\`\`
polyguild/
├── src/
│   ├── app/                # Next.js app directory
│   │   ├── api/           # API routes
│   │   ├── markets/       # Markets page
│   │   ├── arbitrage/     # Arbitrage page
│   │   └── traders/       # Traders page
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── MarketCard.tsx
│   │   ├── ArbitrageCard.tsx
│   │   └── Navigation.tsx
│   └── lib/              # Core logic
│       ├── polymarket/   # Polymarket API client
│       ├── kalshi/       # Kalshi API client
│       ├── unified/      # Unified data types & transformers
│       ├── arbitrage/    # Arbitrage scanner
│       └── db.ts         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
└── public/
\`\`\`

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically:
- Set up the PostgreSQL database (Vercel Postgres)
- Run database migrations
- Configure cron jobs for automated scanning

## Development

### Database Migrations

When you change the Prisma schema:

\`\`\`bash
npx prisma migrate dev --name your_migration_name
npx prisma generate
\`\`\`

### Adding New Features

1. Update Prisma schema if needed
2. Create API routes in `src/app/api/`
3. Build UI components in `src/components/`
4. Create pages in `src/app/`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Disclaimer

This tool is for informational purposes only. Always verify opportunities and prices before executing trades. Prediction market trading involves risk.

