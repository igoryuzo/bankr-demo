# Bankr Live Trading Agent + Dashboard

An autonomous AI trading agent that scans trending tokens on Base, picks high-conviction trades, and executes swaps via the [Bankr](https://bankr.bot) Agent API. Includes a real-time Next.js dashboard to monitor agent activity, portfolio, and trade history.

## Architecture

```
bankr-demo/
├── apps/web/          # Next.js 16 dashboard (real-time feed, portfolio, trades)
├── packages/agent/    # Node.js trading bot (scan → decide → swap → log)
├── supabase/          # Database migrations (3 tables)
└── turbo.json         # Turborepo workspace config
```

**Agent cycle** (every 3 minutes):
1. Ask Bankr: "What tokens are trending on Base?"
2. Parse the response locally for high-conviction picks (TOKEN - up - high/medium)
3. Send a direct swap command: `swap 1.00 USDC to TOKEN on base`
4. Check wallet balance and log everything to Supabase

**Dashboard** (Next.js):
- Live feed of all agent activity (polls every 2s)
- Portfolio value with token breakdown (polls every 5s)
- Recent trades with win rate
- Wallet address with copy-to-clipboard

## Prerequisites

- Node.js 18+
- npm
- A [Bankr](https://bankr.bot) account with API key
- A [Supabase](https://supabase.com) project

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/igoryuzo/bankr-demo.git
cd bankr-demo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the SQL Editor and run the migration file:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial.sql
-- This creates three tables: agent_logs, trades, balances
-- And enables Realtime on all three
```

3. Get your project URL and service role key from Settings > API

### 4. Get a Bankr API key

1. Sign up at [bankr.bot](https://bankr.bot)
2. Go to [bankr.bot/api](https://bankr.bot/api) and generate an API key
3. **Enable Agent API access** on the key
4. **Disable read-only mode** (critical — the agent needs write access to execute swaps)
5. Optionally subscribe to Bankr Club for higher rate limits (1,000 messages/day vs 100)

> **Important**: The API key must have read-only mode **turned off**. If it's on, the agent can scan trends and check balances but all swap commands will be rejected with "your session is locked in read-only mode".

### 5. Configure environment variables

**Agent** (`packages/agent/.env.local`):

```bash
# Bankr
BANKR_API_KEY=bk_your_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key

# Agent Config
AGENT_INTERVAL_MS=180000        # 3 minutes between cycles
AGENT_MAX_TRADE_PCT=1           # Max % of portfolio per trade
```

**Web dashboard** (`apps/web/.env.local`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
```

### 6. Run in development

Start both services in separate terminals:

```bash
# Terminal 1: Web dashboard
npm run dev

# Terminal 2: Trading agent
npm run agent:dev
```

- Dashboard: [http://localhost:3000](http://localhost:3000)
- Agent logs will appear in the terminal and stream to the dashboard in real-time

## How the Agent Works

The agent uses the `@bankr/cli` package to communicate with the Bankr Agent API:

1. **Scan** — Sends a prompt asking Bankr for trending tokens on Base. Bankr's AI agent fetches on-chain data, runs technical analysis, and returns picks with conviction levels.

2. **Decide** — Parses the scan response locally using regex to extract picks in the format `TOKEN - up/down - high/medium/low`. Filters for "up" direction + high/medium conviction, skips stablecoins and ETH.

3. **Execute** — Sends a direct swap command to Bankr: `swap 1.00 USDC to BNKR on base`. Bankr handles the DEX routing, gas, and transaction submission.

4. **Balance** — Asks Bankr for the current wallet balance and parses the response to update the portfolio display.

All steps are logged to Supabase (`agent_logs` table) and displayed in the dashboard live feed.

## Bankr API Flow

```
POST /agent/prompt  →  { jobId, threadId }
GET  /agent/job/:id →  poll until status === "completed"
                    →  { response, transactions }
```

The API key authenticates via `X-API-Key` header. The `@bankr/cli` package handles prompt submission, job polling, and authentication automatically.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BANKR_API_KEY` | — | Your Bankr API key (must have agent access + write enabled) |
| `AGENT_INTERVAL_MS` | `180000` | Milliseconds between trading cycles (3 min) |
| `AGENT_MAX_TRADE_PCT` | `1` | Max percentage of USDC balance per trade |

## Database Schema

Three Supabase tables (see `supabase/migrations/001_initial.sql`):

- **`agent_logs`** — Every agent action (prompts, responses, trades, errors, scans)
- **`trades`** — Structured trade records with status, tx hash, amounts
- **`balances`** — Periodic portfolio snapshots with USD total and token breakdown

## Deployment

Both services have `Procfile`s for Railway/Heroku deployment:

- `apps/web/Procfile`: `web: npm run start`
- `packages/agent/Procfile`: `worker: npm run start`

Build the agent before deploying:

```bash
npm run build --workspace=packages/agent
```

## Troubleshooting

**"your session is locked in read-only mode"**
- Go to [bankr.bot/api](https://bankr.bot/api) and disable read-only mode on your API key

**Portfolio shows $0.00**
- The balance parser expects Bankr's format: `Token Name - amount SYMBOL $value`
- If Bankr changes their response format, the regex in `strategy.ts` `checkBalance()` may need updating

**Agent not executing trades**
- Verify `BANKR_API_KEY` has Agent API access enabled
- Verify read-only mode is off
- Check the dashboard live feed for error logs

**Multiple agent instances running**
- Kill all instances: `pkill -f "tsx src/index.ts"`
- Only run one agent process at a time to avoid API rate limit conflicts

## Claude Code Plugin

To use Bankr with Claude Code directly:

```bash
claude plugin marketplace add BankrBot/claude-plugins
claude plugin install bankr-agent
```

## Links

- [Bankr](https://bankr.bot) — AI-powered crypto trading
- [Bankr API Docs](https://bankr.bot/api) — Agent API documentation
- [Bankr API Examples](https://github.com/BankrBot/bankr-api-examples) — Example apps
- [@bankr/cli](https://www.npmjs.com/package/@bankr/cli) — CLI/SDK package
