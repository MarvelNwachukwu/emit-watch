# Event Watch

Paste any smart contract address, auto-fetch the ABI, and view a live feed of decoded events.

Supports **Ethereum**, **Arbitrum**, and **Polygon** via the Etherscan V2 unified API.

## Features

- Auto-fetches and parses ABIs (handles proxy contracts transparently)
- Live polling mode with 12-second intervals
- Event type filtering and address search across args
- Smart value formatting (wei, 6-decimal tokens, addresses)
- CSV export with formula injection protection
- Manual ABI input fallback for unverified contracts
- Dark/light theme with system preference detection

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Environment Variables

Copy `.env.example` or create `.env.local`:

```
ETHERSCAN_API_KEY=your_etherscan_api_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com  # optional, for OG image
```

Get a free API key at [etherscan.io/apis](https://etherscan.io/apis).

### Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- viem (event decoding)
- Zod v4 (API validation)
- Etherscan V2 API

## Project Structure

```
src/
  app/
    api/contract/       # ABI + events API routes
    layout.tsx          # Shell, theme, fonts
    page.tsx            # Entry point
    opengraph-image.tsx # Dynamic OG image
    icon.svg            # Favicon
  components/           # AddressInput, EventCard, EventFeed, etc.
  lib/
    explorer.ts         # Etherscan client with proxy detection
    decoder.ts          # viem event log decoder
    cache.ts            # In-memory TTL cache
    rate-limiter.ts     # Token bucket rate limiter
    chains.ts           # Chain configs
    types.ts            # Shared types
    utils.ts            # Formatting, CSV export, helpers
```
