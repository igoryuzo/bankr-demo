import "./env.js";
import { validateApiKey, getUserInfo } from "@bankr/cli";
import { log } from "./db.js";
import { scanTrends, decideAndTrade, executeTrade, checkBalance } from "./strategy.js";

const INTERVAL_MS = parseInt(process.env.AGENT_INTERVAL_MS || "180000", 10);

let running = true;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function init() {
  console.log("[agent] Starting Bankr Trading Agent...");

  const valid = await validateApiKey();
  if (!valid) {
    console.error("[agent] Invalid Bankr API key. Set BANKR_API_KEY env var.");
    process.exit(1);
  }

  await log("system", "Agent starting up — validating API key...");

  const userInfo = await getUserInfo();
  const wallet = userInfo.wallets?.find((w) => w.chain === "base") ?? userInfo.wallets?.[0];

  await log("system", `Connected: ${wallet?.address?.slice(0, 6)}...${wallet?.address?.slice(-4)} on ${wallet?.chain ?? "unknown"}`, {
    raw_data: userInfo,
  });

  console.log(`[agent] Wallet: ${wallet?.address}`);
  console.log(`[agent] Cycle interval: ${INTERVAL_MS}ms`);

  return userInfo;
}

async function cycle() {
  const ctx: { threadId?: string } = {};

  try {
    // Step 1: Scan trends
    await log("scanning", "Starting new scan cycle...");
    const analysis = await scanTrends(ctx);

    // Step 2: Decide on trade
    const trade = await decideAndTrade(ctx, analysis);

    if (trade) {
      // Step 3: Execute trade
      await executeTrade(ctx, {
        amountIn: trade.amountIn,
        tokenIn: trade.tokenIn,
        tokenOut: trade.tokenOut,
      });
    }

    // Step 4: Check balance
    await checkBalance(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent] Cycle error:", message);
    await log("error", `Cycle error: ${message}`, {
      raw_data: { error: message },
      thread_id: ctx.threadId,
    });
  }
}

async function main() {
  await init();

  // Initial balance check
  try {
    await checkBalance({});
  } catch {
    console.warn("[agent] Initial balance check failed, continuing...");
  }

  while (running) {
    await cycle();
    console.log(`[agent] Sleeping ${INTERVAL_MS / 1000}s until next cycle...`);
    await sleep(INTERVAL_MS);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[agent] Shutting down...");
  running = false;
  log("system", "Agent shutting down (SIGINT)").then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("[agent] Shutting down...");
  running = false;
  log("system", "Agent shutting down (SIGTERM)").then(() => process.exit(0));
});

main().catch((err) => {
  console.error("[agent] Fatal error:", err);
  process.exit(1);
});
