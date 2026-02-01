import type { RigActionParams } from "./actions/rig-action";
import type {
  MineRigState,
  SpinRigState,
  FundRigState,
  RigInfo,
  AuctionState,
  LPState,
  WorldState,
} from "./state";
import type { AgentConfig } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoredAction =
  | { type: "idle" }
  | { type: "claim"; rigState: MineRigState | FundRigState }
  | {
      type: "rig-action";
      rigState: MineRigState | SpinRigState | FundRigState;
      params: RigActionParams;
    }
  | {
      type: "buy";
      unitAddress: `0x${string}`;
      lpAddress: `0x${string}`;
      amount: bigint;
    }
  | { type: "sell"; unitAddress: `0x${string}`; amount: bigint }
  | {
      type: "auction";
      rigInfo: RigInfo;
      auctionState: AuctionState;
      lpState: LPState;
    };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ONE = 10n ** 18n;

/** Add uniform noise in [-5, +5] to a score. */
function addNoise(score: number): number {
  return score + Math.random() * 10 - 5;
}

// ---------------------------------------------------------------------------
// Score: Claim (90-100) -- highest priority, free value
// ---------------------------------------------------------------------------

type ScoredCandidate = { score: number; action: ScoredAction };

function scoreClaims(world: WorldState): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const rig of world.rigs) {
    const state = rig.state;
    const rigType = state.rig.type;

    if (rigType === "mine") {
      const mine = state as MineRigState;
      if (mine.accountClaimable > 0n) {
        candidates.push({
          score: addNoise(95),
          action: { type: "claim", rigState: mine },
        });
      }
    } else if (rigType === "fund") {
      const fund = state as FundRigState;
      if (fund.unclaimedDays.length > 0) {
        candidates.push({
          score: addNoise(95),
          action: { type: "claim", rigState: fund },
        });
      }
    }
    // SpinRig has no claim action
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Score: Rig Action (30-80) -- participate based on price decay
// ---------------------------------------------------------------------------

function scoreRigActions(
  world: WorldState,
  config: AgentConfig,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const rig of world.rigs) {
    const state = rig.state;
    const rigType = state.rig.type;

    if (rigType === "fund") {
      // FundRig does not have epochId/initPrice/price.
      // Score fund actions at 40-60 based on emission level.
      const fund = state as FundRigState;

      // Use todayEmission as an attractiveness signal.
      // Higher emission = more valuable to fund.
      const emission = fund.todayEmission;
      if (emission === 0n) continue;

      // Compute fundAmount: maxSpendPercent of the agent's quote balance
      const fundAmount =
        fund.accountQuoteBalance * BigInt(config.maxSpendPercent) / 100n;
      if (fundAmount === 0n) continue;

      // Score 40-60 based on emission. Use log-ish scale:
      // normalize emission to whole tokens, cap contribution at 20
      const emissionTokens = Number(emission / ONE);
      const baseScore = 40 + Math.min(20, emissionTokens);

      const params: RigActionParams = {
        rigAddress: fund.rig.address,
        rigType: "fund",
        quoteAddress: fund.rig.quoteAddress,
        epochId: fund.currentDay,
        maxPrice: fundAmount, // not used for fund, but kept for completeness
        entropyFee: 0n,
        fundAmount,
      };

      candidates.push({
        score: addNoise(baseScore),
        action: { type: "rig-action", rigState: fund, params },
      });

      continue;
    }

    // Mine or Spin -- uses Dutch auction pricing
    if (rigType === "mine") {
      const mine = state as MineRigState;
      if (mine.initPrice === 0n) continue; // no epoch started

      const pricePercent = Number((mine.price * 100n) / mine.initPrice);
      if (pricePercent >= config.maxPricePercent) continue;

      let baseScore = 80 - pricePercent;

      // Check agent has enough quote token
      if (mine.accountQuoteBalance < mine.price) continue;

      // Check agent has enough ETH for entropy fee
      if (world.ethBalance < mine.entropyFee) continue;

      const params: RigActionParams = {
        rigAddress: mine.rig.address,
        rigType: "mine",
        quoteAddress: mine.rig.quoteAddress,
        slotIndex: 0,
        epochId: mine.epochId,
        maxPrice: (mine.price * 120n) / 100n, // 20% slippage buffer
        entropyFee: mine.entropyFee,
      };

      candidates.push({
        score: addNoise(baseScore),
        action: { type: "rig-action", rigState: mine, params },
      });
    } else if (rigType === "spin") {
      const spin = state as SpinRigState;
      if (spin.initPrice === 0n) continue; // no epoch started

      const pricePercent = Number((spin.price * 100n) / spin.initPrice);
      if (pricePercent >= config.maxPricePercent) continue;

      let baseScore = 80 - pricePercent;

      // Bonus if prize pool is large
      baseScore += Math.min(10, Number(spin.prizePool / ONE));

      // Check agent has enough quote token
      if (spin.accountQuoteBalance < spin.price) continue;

      // Check agent has enough ETH for entropy fee
      if (world.ethBalance < spin.entropyFee) continue;

      const params: RigActionParams = {
        rigAddress: spin.rig.address,
        rigType: "spin",
        quoteAddress: spin.rig.quoteAddress,
        epochId: spin.epochId,
        maxPrice: (spin.price * 120n) / 100n, // 20% slippage buffer
        entropyFee: spin.entropyFee,
      };

      candidates.push({
        score: addNoise(baseScore),
        action: { type: "rig-action", rigState: spin, params },
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Score: Buy (20-50) -- buy Unit on LP when underweight
// ---------------------------------------------------------------------------

function scoreBuys(
  world: WorldState,
  config: AgentConfig,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const rig of world.rigs) {
    const state = rig.state;
    const unitPrice = state.unitPrice;
    if (unitPrice === 0n) continue; // no LP activity

    const unitBalance = state.accountUnitBalance;
    const usdcBalance = state.accountUsdcBalance;

    // unitValue in USDC terms
    const unitValue = (unitBalance * unitPrice) / ONE;
    const totalValue = usdcBalance + unitValue;
    if (totalValue === 0n) continue;

    const unitPercent = Number((unitValue * 100n) / totalValue);

    if (unitPercent >= 40) continue; // not underweight

    const baseScore = 20 + (40 - unitPercent);

    // Amount of USDC to spend
    const amount =
      world.usdcBalance * BigInt(config.maxSpendPercent) / 100n;
    if (amount === 0n) continue;

    candidates.push({
      score: addNoise(baseScore),
      action: {
        type: "buy",
        unitAddress: state.rig.unitAddress,
        lpAddress: state.rig.lpAddress,
        amount,
      },
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Score: Sell (20-50) -- sell Unit on LP when overweight
// ---------------------------------------------------------------------------

function scoreSells(
  world: WorldState,
  _config: AgentConfig,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const rig of world.rigs) {
    const state = rig.state;
    const unitPrice = state.unitPrice;
    if (unitPrice === 0n) continue;

    const unitBalance = state.accountUnitBalance;
    const usdcBalance = state.accountUsdcBalance;

    const unitValue = (unitBalance * unitPrice) / ONE;
    const totalValue = usdcBalance + unitValue;
    if (totalValue === 0n) continue;

    const unitPercent = Number((unitValue * 100n) / totalValue);

    if (unitPercent <= 80) continue; // not overweight

    const baseScore = 20 + (unitPercent - 80);

    // Sell enough to move toward 60% allocation
    let sellAmount =
      (unitBalance * BigInt(unitPercent - 60)) / BigInt(unitPercent);
    // Cap at 20% of holdings
    const maxSell = unitBalance / 5n;
    if (sellAmount > maxSell) {
      sellAmount = maxSell;
    }
    if (sellAmount === 0n) continue;

    candidates.push({
      score: addNoise(baseScore),
      action: {
        type: "sell",
        unitAddress: state.rig.unitAddress,
        amount: sellAmount,
      },
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Score: Auction (40-70) -- buy treasury USDC when discounted
// ---------------------------------------------------------------------------

function scoreAuctions(
  world: WorldState,
  config: AgentConfig,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const rig of world.rigs) {
    const { auction: auctionState, lp: lpState, state: rigState } = rig;

    if (auctionState.quoteAccumulated === 0n) continue; // nothing in treasury
    if (auctionState.price === 0n) continue;

    // Estimate LP cost in quote terms
    const lpCost =
      (auctionState.price * auctionState.paymentTokenPrice) / ONE;

    // Discount: how much cheaper is the treasury USDC vs LP cost
    // Avoid division by zero (quoteAccumulated > 0 already checked)
    if (auctionState.quoteAccumulated <= lpCost) continue; // no discount

    const discount = Number(
      ((auctionState.quoteAccumulated - lpCost) * 100n) /
        auctionState.quoteAccumulated,
    );

    if (discount < config.auctionMinDiscount) continue;

    const baseScore = 40 + Math.min(30, discount); // capped at 70

    candidates.push({
      score: addNoise(baseScore),
      action: {
        type: "auction",
        rigInfo: rigState.rig,
        auctionState,
        lpState,
      },
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Main: pickAction
// ---------------------------------------------------------------------------

/**
 * Score all possible actions based on the current world state and agent
 * configuration.  Returns the highest-scoring action, or `{ type: "idle" }`
 * if no action scores high enough (threshold: 15).
 *
 * This function is purely computational -- no async, no contract calls.
 */
export function pickAction(world: WorldState, config: AgentConfig): ScoredAction {
  const candidates: ScoredCandidate[] = [
    ...scoreClaims(world),
    ...scoreRigActions(world, config),
    ...scoreBuys(world, config),
    ...scoreSells(world, config),
    ...scoreAuctions(world, config),
  ];

  if (candidates.length === 0) {
    return { type: "idle" };
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (best.score < 15) {
    return { type: "idle" };
  }

  return best.action;
}
