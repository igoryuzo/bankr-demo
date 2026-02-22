import { submitPrompt, pollJob } from "@bankr/cli";
import { log, insertTrade, updateTrade, insertBalance } from "./db.js";

const MAX_TRADE_PCT = parseInt(process.env.AGENT_MAX_TRADE_PCT || "15", 10);

interface CycleContext {
  threadId?: string;
}

async function promptAndPoll(
  prompt: string,
  threadId?: string,
  label?: string
): Promise<{ response: string; jobId: string; threadId?: string }> {
  await log("prompt", label || prompt.slice(0, 80) + "...", { raw_data: { prompt } });

  const submitted = await submitPrompt(prompt, threadId);
  if (!submitted.success) {
    throw new Error(`submitPrompt failed: ${submitted.message}`);
  }

  const result = await pollJob(submitted.jobId, {
    interval: 3000,
    maxAttempts: 100,
    onStatus: (s) => {
      if (s.status === "processing") {
        log("system", `Job ${submitted.jobId} processing...`, {
          job_id: submitted.jobId,
          thread_id: submitted.threadId,
        });
      }
    },
  });

  if (result.status === "failed") {
    throw new Error(`Job failed: ${result.error || "unknown"}`);
  }

  const response = result.response || "";
  await log("response", response.slice(0, 500), {
    raw_data: result,
    job_id: submitted.jobId,
    thread_id: submitted.threadId,
  });

  return {
    response,
    jobId: submitted.jobId,
    threadId: submitted.threadId,
  };
}

export async function scanTrends(ctx: CycleContext) {
  await log("scanning", "Scanning trending tokens on Base...");

  const result = await promptAndPoll(
    `What tokens are trending on Base right now? Analyze the top movers, their momentum, and any notable signals. Give me your top 3 picks with conviction levels (high/medium/low). Format each as: TOKEN_SYMBOL - direction (up/down) - conviction (high/medium/low) - brief reason.`,
    ctx.threadId,
    "Scanning trending tokens on Base..."
  );

  ctx.threadId = result.threadId;

  await log("analysis", `Trend analysis complete`, {
    raw_data: { response: result.response },
    thread_id: ctx.threadId,
  });

  return result.response;
}

export async function decideAndTrade(ctx: CycleContext, analysis: string) {
  const result = await promptAndPoll(
    `Based on the analysis above, recommend ONE specific trade. I want to use at most ${MAX_TRADE_PCT}% of my USDC balance. Tell me exactly: which token to buy, how much USDC to spend. Be specific with the amount. If nothing looks good enough, say "NO_TRADE" and explain why.`,
    ctx.threadId,
    "Deciding on trade..."
  );

  ctx.threadId = result.threadId;
  const response = result.response.toUpperCase();

  if (response.includes("NO_TRADE")) {
    await log("analysis", "Agent decided: no trade this cycle", {
      raw_data: { response: result.response },
      thread_id: ctx.threadId,
    });
    return null;
  }

  // Parse a swap recommendation from the response
  const swapMatch = result.response.match(
    /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for)\s+(\w+)/i
  );
  // Also try "buy X TOKEN with Y USDC" pattern
  const buyMatch = result.response.match(
    /(\d+(?:\.\d+)?)\s+USDC\s+(?:to|for|into|→)\s+(\w+)/i
  );

  let amountIn: string;
  let tokenIn: string;
  let tokenOut: string;

  if (swapMatch) {
    amountIn = swapMatch[1];
    tokenIn = swapMatch[2];
    tokenOut = swapMatch[3];
  } else if (buyMatch) {
    amountIn = buyMatch[1];
    tokenIn = "USDC";
    tokenOut = buyMatch[2];
  } else {
    // Fallback: try to extract any amount + token from the response
    const amountMatch = result.response.match(/(\d+(?:\.\d+)?)\s*USDC/i);
    const tokenMatch = result.response.match(
      /(?:buy|swap.*?(?:to|for))\s+(\w+)/i
    );

    if (amountMatch && tokenMatch) {
      amountIn = amountMatch[1];
      tokenIn = "USDC";
      tokenOut = tokenMatch[1];
    } else {
      await log("analysis", "Could not parse trade recommendation, skipping", {
        raw_data: { response: result.response },
        thread_id: ctx.threadId,
      });
      return null;
    }
  }

  return { amountIn, tokenIn, tokenOut, threadId: ctx.threadId };
}

export async function executeTrade(
  ctx: CycleContext,
  trade: { amountIn: string; tokenIn: string; tokenOut: string }
) {
  await log(
    "trade",
    `Executing swap: ${trade.amountIn} ${trade.tokenIn} → ${trade.tokenOut}`,
    { thread_id: ctx.threadId }
  );

  const tradeRow = await insertTrade({
    token_in: trade.tokenIn,
    token_out: trade.tokenOut,
    amount_in: trade.amountIn,
    status: "pending",
  });

  try {
    const result = await promptAndPoll(
      `swap ${trade.amountIn} ${trade.tokenIn} to ${trade.tokenOut} on base`,
      ctx.threadId,
      `Swapping ${trade.amountIn} ${trade.tokenIn} → ${trade.tokenOut}`
    );

    ctx.threadId = result.threadId;

    // Try to extract tx hash from response
    const txMatch = result.response.match(/0x[a-fA-F0-9]{64}/);
    const txHash = txMatch ? txMatch[0] : null;

    // Try to extract amount received
    const amountOutMatch = result.response.match(
      /(\d+(?:\.\d+)?)\s*(?:tokens?|units?)?\s*(?:of\s+)?(?:\w+)/i
    );

    if (tradeRow) {
      await updateTrade(tradeRow.id, {
        status: "completed",
        tx_hash: txHash ?? undefined,
        amount_out: amountOutMatch ? amountOutMatch[1] : undefined,
        raw_response: result,
      });
    }

    await log(
      "trade",
      `Swap complete: ${trade.amountIn} ${trade.tokenIn} → ${trade.tokenOut}` +
        (txHash ? ` (tx: ${txHash.slice(0, 10)}...)` : ""),
      {
        raw_data: result,
        job_id: result.jobId,
        thread_id: ctx.threadId,
      }
    );

    return result;
  } catch (err) {
    if (tradeRow) {
      await updateTrade(tradeRow.id, {
        status: "failed",
        raw_response: { error: String(err) },
      });
    }
    throw err;
  }
}

export async function checkBalance(ctx: CycleContext) {
  const result = await promptAndPoll(
    "What is my current wallet balance? Show all tokens and their USD values.",
    ctx.threadId,
    "Checking wallet balance..."
  );

  ctx.threadId = result.threadId;

  // Try to parse total USD from response
  const totalMatch = result.response.match(
    /(?:total|balance)[:\s]*\$?([\d,]+(?:\.\d+)?)/i
  );
  const totalUsd = totalMatch
    ? parseFloat(totalMatch[1].replace(/,/g, ""))
    : 0;

  // Try to parse individual token balances
  const breakdown: Record<string, number> = {};
  const tokenMatches = result.response.matchAll(
    /(\w+)[:\s]+\$?([\d,]+(?:\.\d+)?)/gi
  );
  for (const match of tokenMatches) {
    const token = match[1].toUpperCase();
    const value = parseFloat(match[2].replace(/,/g, ""));
    if (!isNaN(value) && value > 0 && token.length <= 10) {
      breakdown[token] = value;
    }
  }

  await insertBalance(totalUsd, breakdown);
  await log("balance_update", `Balance: $${totalUsd.toFixed(2)}`, {
    raw_data: { total_usd: totalUsd, breakdown },
    thread_id: ctx.threadId,
  });

  return { totalUsd, breakdown };
}
