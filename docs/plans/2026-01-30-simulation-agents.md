# Simulation Agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a Node.js agent system that creates realistic on-chain activity — mining, spinning, funding, buying, selling, providing liquidity, buying auctions, and claiming rewards — across existing rigs on the Farplace launchpad.

**Architecture:** A `packages/agents/` package with a single general-purpose Agent class. Each agent has a wallet (from .env), a list of target rigs, and a heartbeat timer. Every tick, the agent reads on-chain state via Multicall contracts, scores 6 possible actions, and executes the highest-scoring one (or idles). Actions: rig-action (mine/spin/fund), buy, sell, buy-auction (with add-liquidity as a sub-step), and claim.

**Tech Stack:** TypeScript, viem (wallet client + public client), dotenv, Uniswap V2 Router for swaps/liquidity, Multicall contracts for state reads

---

## Context

### Contract Addresses (all on Base, mock tokens for staging)

```
MineCore:       0x504d4f579b5e16dB130d1ABd8579BA03087AE1b1
SpinCore:       0x2E392a607F94325871C74Ee9b9F5FBD44CcB5631
FundCore:       0x85f3e3135329272820ADC27F2561241f4b4e90db
MineMulticall:  0xE59CD876ae177Ff513C1efB6922f9902e984946C
SpinMulticall:  0x71Ff3f51b0bB61B9205BF2F6c4600E86D4F7CFa1
FundMulticall:  0xC39AF527b30509e28EC265F847c00432d54cd9E6
MockUSDC:       0xe90495BE187d434e23A9B1FeC0B6Ce039700870e  (6 decimals, public mint)
MockDONUT:      0xD50B69581362C60Ce39596B237C71e07Fc4F6fdA  (18 decimals, public mint)
UniV2Router:    0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24
UniV2Factory:   0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6
```

### Rig Type Detection

Call `isDeployedRig(address)` on MineCore, SpinCore, FundCore. Whichever returns `true` is the rig type.

### Mock Token Minting

Both MockUSDC and MockDONUT have `function mint(address to, uint256 amount) external` — no access control, anyone can mint.

### Existing ABIs

All ABIs are in `packages/app/lib/contracts.ts`:
- `CORE_ABI` — Core contract reads (isDeployedRig, rigToUnit, rigToAuction, rigToLP, rigToQuote)
- `MULTICALL_ABI` — MineMulticall (getRig, getAuction, mine, buy, estimateMineMultipleCost)
- `SPIN_MULTICALL_ABI` — SpinMulticall (getRig, getAuction, spin, getOdds, getEntropyFee, buy)
- `FUND_MULTICALL_ABI` — FundMulticall (getRig, getAuction, fund, claim, claimMultiple, getClaimableDays, getTotalPendingRewards, buy)
- `RIG_ABI` — Direct rig reads (mine, claim, getSlot, getPrice, getUps, accountToClaimable, etc.)
- `AUCTION_ABI` — Auction reads (epochId, getPrice, paymentToken, etc.)
- `ERC20_ABI` — Standard ERC20 (balanceOf, approve, allowance, decimals)
- `UNIV2_ROUTER_ABI` — Only addLiquidity (need to add swap functions)
- `UNIV2_PAIR_ABI` — getReserves, token0, token1, totalSupply

### Key Contract Interactions Per Action

**Rig Action (mine):** `MineMulticall.mine(rig, slotIndex, epochId, deadline, maxPrice, slotUri)` — payable (entropy fee in ETH). Requires USDC approval to MineMulticall.

**Rig Action (spin):** `SpinMulticall.spin(rig, epochId, deadline, maxPrice)` — payable (entropy fee in ETH). Requires USDC approval to SpinMulticall.

**Rig Action (fund):** `FundMulticall.fund(rig, account, amount)` — not payable. Requires USDC approval to FundMulticall.

**Buy (swap USDC → Unit via LP):** Use Uni V2 Router `swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)` with path `[USDC, DONUT]` then swap DONUT for Unit via the Unit/DONUT pair. Actually simpler: since LPs are Unit/DONUT, buy = swap DONUT → Unit. Agent needs DONUT first (mint it or swap USDC→DONUT if a USDC/DONUT pair exists). Simplest approach: agent mints DONUT (mock) and swaps DONUT → Unit on the LP.

**Sell (swap Unit → DONUT via LP):** Uni V2 Router `swapExactTokensForTokens` with path `[Unit, DONUT]`.

**Add Liquidity:** Uni V2 Router `addLiquidity(Unit, DONUT, amountUnit, amountDonut, 0, 0, agent, deadline)`. Requires approval of both Unit and DONUT to the router.

**Buy Auction:** `Multicall.buy(rig, epochId, deadline, maxPaymentTokenAmount)`. Requires LP token approval to the respective Multicall contract.

**Claim (MineRig):** `MineRig.claim(account)` directly on the rig contract (via RIG_ABI).

**Claim (FundRig):** `FundMulticall.claimMultiple(rig, account, dayIds)`.

---

### Task 1: Package setup and shared config

**Files:**
- Create: `packages/agents/package.json`
- Create: `packages/agents/tsconfig.json`
- Create: `packages/agents/.env.example`
- Create: `packages/agents/src/config.ts`

**What to do:**

**package.json:**
```json
{
  "name": "farplace-agents",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "npx tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "viem": "^2.21.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**.env.example:**
```
# RPC URL for Base
RPC_URL=https://base.llamarpc.com

# Agent private keys (one per line, comma-separated)
AGENT_KEYS=0xprivatekey1,0xprivatekey2,0xprivatekey3

# Rig addresses to target (comma-separated)
TARGET_RIGS=0xrigAddress1,0xrigAddress2

# Agent config
HEARTBEAT_MIN=30
HEARTBEAT_MAX=60
MAX_PRICE_PERCENT=40
MAX_SPEND_PERCENT=10
AUCTION_MIN_DISCOUNT=20
```

**src/config.ts** — All addresses, ABIs, and agent config loading:

```typescript
import { parseAbi } from "viem";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Contract addresses (Base — mock tokens for staging)
// ---------------------------------------------------------------------------

export const ADDRESSES = {
  mineCore: "0x504d4f579b5e16dB130d1ABd8579BA03087AE1b1",
  spinCore: "0x2E392a607F94325871C74Ee9b9F5FBD44CcB5631",
  fundCore: "0x85f3e3135329272820ADC27F2561241f4b4e90db",
  mineMulticall: "0xE59CD876ae177Ff513C1efB6922f9902e984946C",
  spinMulticall: "0x71Ff3f51b0bB61B9205BF2F6c4600E86D4F7CFa1",
  fundMulticall: "0xC39AF527b30509e28EC265F847c00432d54cd9E6",
  usdc: "0xe90495BE187d434e23A9B1FeC0B6Ce039700870e",
  donut: "0xD50B69581362C60Ce39596B237C71e07Fc4F6fdA",
  uniV2Router: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
  uniV2Factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
} as const;

// ---------------------------------------------------------------------------
// ABIs
// ---------------------------------------------------------------------------

// Copy the following ABIs from packages/app/lib/contracts.ts verbatim:
// - CORE_ABI (isDeployedRig, rigToUnit, rigToAuction, rigToLP, rigToQuote)
// - MULTICALL_ABI (getRig, getAuction, mine, buy, estimateMineMultipleCost)
// - SPIN_MULTICALL_ABI (getRig, getAuction, spin, getOdds, getEntropyFee, buy)
// - FUND_MULTICALL_ABI (getRig, getAuction, fund, claim, claimMultiple, getClaimableDays, getTotalPendingRewards, buy)
// - RIG_ABI (claim, accountToClaimable, getSlot, getPrice, capacity, etc.)
// - ERC20_ABI (balanceOf, approve, allowance, decimals)
// - UNIV2_PAIR_ABI (getReserves, token0, token1, totalSupply)
// - UNIV2_ROUTER_ABI (addLiquidity — copy from contracts.ts)
//
// Import them directly: since packages/app uses path aliases (@/lib/...) that
// won't resolve from packages/agents, copy the const arrays into this file.
// They're plain objects, not framework-dependent.

// Additionally, add these ABIs that don't exist in the frontend:

export const MOCK_TOKEN_ABI = parseAbi([
  "function mint(address to, uint256 amount) external",
]);

export const UNIV2_SWAP_ABI = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
]);

// ---------------------------------------------------------------------------
// Agent config from .env
// ---------------------------------------------------------------------------

export type RigType = "mine" | "spin" | "fund";

export type AgentConfig = {
  name: string;
  privateKey: `0x${string}`;
  rigs: `0x${string}`[];
  heartbeatRange: [number, number]; // [min, max] in seconds
  maxPricePercent: number;          // only rig-action when price < N% of initPrice
  maxSpendPercent: number;          // max % of USDC balance per action
  auctionMinDiscount: number;       // only buy auction if N%+ discount
};

export function loadAgentConfigs(): AgentConfig[] {
  const keys = (process.env.AGENT_KEYS ?? "").split(",").filter(Boolean);
  const rigs = (process.env.TARGET_RIGS ?? "").split(",").filter(Boolean) as `0x${string}`[];
  const heartbeatMin = parseInt(process.env.HEARTBEAT_MIN ?? "30");
  const heartbeatMax = parseInt(process.env.HEARTBEAT_MAX ?? "60");
  const maxPricePercent = parseInt(process.env.MAX_PRICE_PERCENT ?? "40");
  const maxSpendPercent = parseInt(process.env.MAX_SPEND_PERCENT ?? "10");
  const auctionMinDiscount = parseInt(process.env.AUCTION_MIN_DISCOUNT ?? "20");

  return keys.map((key, i) => ({
    name: `agent-${i}`,
    privateKey: key.trim() as `0x${string}`,
    rigs,
    heartbeatRange: [heartbeatMin, heartbeatMax],
    maxPricePercent,
    maxSpendPercent,
    auctionMinDiscount,
  }));
}
```

**Verification:** `cd packages/agents && npm install && npx tsc --noEmit` — should compile with no errors.

---

### Task 2: State reader

**Files:**
- Create: `packages/agents/src/state.ts`

**What to do:**

Build a module that reads all on-chain state an agent needs to make decisions. Uses viem `publicClient` to batch-read from Multicall contracts.

For each target rig, the state reader must:

1. **Detect rig type** — call `isDeployedRig(rigAddress)` on MineCore, SpinCore, FundCore. Cache the result (rig type never changes).

2. **Read rig state** — based on type:
   - MineRig: `MineMulticall.getRig(rig, 0, agentAddress)` for slot 0 (extend to all slots later via `capacity`)
   - SpinRig: `SpinMulticall.getRig(rig, agentAddress)`
   - FundRig: `FundMulticall.getRig(rig, agentAddress)`

3. **Read auction state** — `Multicall.getAuction(rig, agentAddress)` (each multicall type has this)

4. **Read LP state** — For the Unit/DONUT pair:
   - Get LP address: `Core.rigToLP(rigAddress)`
   - Get reserves: `pair.getReserves()`
   - Get token order: `pair.token0()` (to know which reserve is Unit vs DONUT)
   - Get agent's LP balance: `ERC20.balanceOf(agentAddress)` on the LP token

5. **Read claimable amounts:**
   - MineRig: `rig.accountToClaimable(agentAddress)` (already in getRig as `accountClaimable`)
   - FundRig: `FundMulticall.getTotalPendingRewards(rig, agentAddress, 0, currentDay)`

6. **Read agent balances** — ETH balance, USDC balance, DONUT balance (some of these come from the Multicall getRig response already: `accountQuoteBalance`, `accountDonutBalance`, `accountUnitBalance`)

Return a `WorldState` type:

```typescript
export type RigInfo = {
  address: `0x${string}`;
  type: RigType;
  unitAddress: `0x${string}`;
  auctionAddress: `0x${string}`;
  lpAddress: `0x${string}`;
  quoteAddress: `0x${string}`;
};

export type MineRigState = {
  rig: RigInfo;
  epochId: bigint;
  initPrice: bigint;
  price: bigint;
  capacity: bigint;
  entropyFee: bigint;
  unitPrice: bigint;         // in DONUT (from LP)
  accountClaimable: bigint;  // claimable miner fees
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;
  accountDonutBalance: bigint;
};

export type SpinRigState = {
  rig: RigInfo;
  epochId: bigint;
  initPrice: bigint;
  price: bigint;
  prizePool: bigint;
  pendingEmissions: bigint;
  entropyFee: bigint;
  unitPrice: bigint;
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;
  accountDonutBalance: bigint;
};

export type FundRigState = {
  rig: RigInfo;
  currentDay: bigint;
  todayEmission: bigint;
  todayTotalDonated: bigint;
  unitPrice: bigint;
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;  // accountPaymentTokenBalance
  accountDonutBalance: bigint;
  accountTodayDonation: bigint;
  pendingRewards: bigint;       // total unclaimed across all days
  unclaimedDays: bigint[];      // day IDs with unclaimed rewards
};

export type AuctionState = {
  epochId: bigint;
  price: bigint;               // LP tokens required
  quoteAccumulated: bigint;    // USDC in treasury
  paymentTokenPrice: bigint;   // LP price in DONUT
  accountLPBalance: bigint;
};

export type LPState = {
  lpAddress: `0x${string}`;
  reserveUnit: bigint;
  reserveDonut: bigint;
  totalSupply: bigint;
  agentLPBalance: bigint;
};

export type WorldState = {
  ethBalance: bigint;
  usdcBalance: bigint;
  donutBalance: bigint;
  rigs: Array<{
    state: MineRigState | SpinRigState | FundRigState;
    auction: AuctionState;
    lp: LPState;
  }>;
};
```

Implement `readWorldState(publicClient, agentAddress, rigInfos): Promise<WorldState>`.

Use `publicClient.multicall()` (viem's built-in multicall batching) to batch all reads into as few RPC calls as possible.

**Verification:** `npx tsc --noEmit` — should compile.

---

### Task 3: Action — Rig Action (mine/spin/fund)

**Files:**
- Create: `packages/agents/src/actions/rig-action.ts`

**What to do:**

Implement the rig action for all three rig types. The agent "participates" in a rig by paying the current Dutch auction price.

```typescript
import { type WalletClient, type PublicClient } from "viem";

export type RigActionParams = {
  rigAddress: `0x${string}`;
  rigType: RigType;
  // For mine:
  slotIndex?: number;
  epochId: bigint;
  maxPrice: bigint;
  entropyFee: bigint;
  // For fund:
  fundAmount?: bigint;
};

export async function executeRigAction(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: RigActionParams,
): Promise<`0x${string}`> {
  // ...
}
```

**Per rig type:**

**MineRig:**
1. Ensure USDC approval to MineMulticall >= maxPrice
2. Call `MineMulticall.mine(rig, slotIndex, epochId, deadline, maxPrice, "")` with `value: entropyFee`
3. `deadline` = `Math.floor(Date.now() / 1000) + 300` (5 min)
4. `slotUri` = `""` (agents don't set metadata)

**SpinRig:**
1. Ensure USDC approval to SpinMulticall >= maxPrice
2. Call `SpinMulticall.spin(rig, epochId, deadline, maxPrice)` with `value: entropyFee`

**FundRig:**
1. Ensure USDC approval to FundMulticall >= fundAmount
2. Call `FundMulticall.fund(rig, agentAddress, fundAmount)`
3. `fundAmount` is determined by the scoring logic (e.g. maxSpendPercent of USDC balance)

**Approval helper** (shared across actions):
```typescript
async function ensureApproval(
  walletClient: WalletClient,
  publicClient: PublicClient,
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Promise<void> {
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [walletClient.account!.address, spender],
  });
  if (allowance < amount) {
    const hash = await walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount * 10n], // approve 10x to reduce future approvals
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
```

Put `ensureApproval` in a shared `packages/agents/src/actions/utils.ts` file since buy, sell, add-liquidity, and auction all need it too.

**Verification:** `npx tsc --noEmit`

---

### Task 4: Action — Buy & Sell (LP swaps)

**Files:**
- Create: `packages/agents/src/actions/swap.ts`

**What to do:**

Implement buy (DONUT → Unit) and sell (Unit → DONUT) via the Uniswap V2 Router.

The LP pairs are Unit/DONUT. Agents hold USDC as their base currency but can mint DONUT (mock) as needed. So the flow is:

**Buy Unit tokens:**
1. Mint DONUT if agent doesn't have enough (call `MockDONUT.mint(agentAddress, amount)`)
2. Approve DONUT to UniV2Router
3. Call `router.swapExactTokensForTokens(amountIn, amountOutMin, [DONUT, Unit], agentAddress, deadline)`
4. `amountOutMin` = use `router.getAmountsOut(amountIn, path)` and apply 2% slippage

**Sell Unit tokens:**
1. Approve Unit to UniV2Router
2. Call `router.swapExactTokensForTokens(amountIn, amountOutMin, [Unit, DONUT], agentAddress, deadline)`
3. `amountOutMin` = getAmountsOut with 2% slippage

**Important:** Each rig has its own Unit token and its own LP pair. The `unitAddress` comes from `Core.rigToUnit(rigAddress)`. The path for buy is `[DONUT, unitAddress]`.

**ABI needed:** The standard Uniswap V2 Router `swapExactTokensForTokens` and `getAmountsOut`. These are NOT in the existing `UNIV2_ROUTER_ABI` from contracts.ts — add them in config.ts as `UNIV2_SWAP_ABI` (already specified in Task 1).

```typescript
export async function executeBuy(
  walletClient: WalletClient,
  publicClient: PublicClient,
  unitAddress: `0x${string}`,
  donutAmountIn: bigint,
): Promise<`0x${string}`>;

export async function executeSell(
  walletClient: WalletClient,
  publicClient: PublicClient,
  unitAddress: `0x${string}`,
  unitAmountIn: bigint,
): Promise<`0x${string}`>;
```

Also add a helper to mint mock tokens:
```typescript
export async function mintDonut(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: bigint,
): Promise<void> {
  const hash = await walletClient.writeContract({
    address: ADDRESSES.donut,
    abi: MOCK_TOKEN_ABI,
    functionName: "mint",
    args: [walletClient.account!.address, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

export async function mintUsdc(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: bigint,
): Promise<void> {
  const hash = await walletClient.writeContract({
    address: ADDRESSES.usdc,
    abi: MOCK_TOKEN_ABI,
    functionName: "mint",
    args: [walletClient.account!.address, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
}
```

**Verification:** `npx tsc --noEmit`

---

### Task 5: Action — Buy Auction (with add-liquidity sub-step)

**Files:**
- Create: `packages/agents/src/actions/auction.ts`

**What to do:**

The auction sells accumulated USDC from the treasury in exchange for LP tokens (which get burned). If the agent doesn't have enough LP tokens, it must add liquidity first.

**Flow:**
1. Check if agent has enough LP tokens for the auction price
2. If not, add liquidity:
   a. Need both Unit and DONUT in the correct ratio (read LP reserves to compute)
   b. If agent lacks Unit, buy some first (or skip auction this tick)
   c. If agent lacks DONUT, mint some (mock)
   d. Approve both Unit and DONUT to UniV2Router
   e. Call `router.addLiquidity(Unit, DONUT, amountUnit, amountDonut, 0, 0, agentAddress, deadline)`
3. Approve LP token to the appropriate Multicall contract
4. Call `Multicall.buy(rig, epochId, deadline, maxPaymentTokenAmount)`

**Scoring input:** The auction is a good deal when `quoteAccumulated` (USDC in treasury) is worth more than the LP tokens being asked. Compare:
- Value of LP tokens at current price (LP → DONUT → approximate USD)
- Value of USDC in treasury (1:1 USD)
- If treasury USDC > LP cost * (1 + auctionMinDiscount/100), it's a good deal

```typescript
export async function executeAuctionBuy(
  walletClient: WalletClient,
  publicClient: PublicClient,
  rigInfo: RigInfo,
  auctionState: AuctionState,
  lpState: LPState,
  multicallAddress: `0x${string}`,
): Promise<`0x${string}`>;
```

**Verification:** `npx tsc --noEmit`

---

### Task 6: Action — Claim

**Files:**
- Create: `packages/agents/src/actions/claim.ts`

**What to do:**

Claim miner fees (MineRig) and daily fund rewards (FundRig). SpinRig has no claim action — winnings are sent in the VRF callback.

**MineRig claim:**
1. Check `accountClaimable > 0` (from getRig state)
2. Call `MineRig.claim(agentAddress)` directly on the rig contract (not multicall)
3. Uses `RIG_ABI` which has the `claim(address)` function

**FundRig claim:**
1. Check `unclaimedDays.length > 0` (from getTotalPendingRewards)
2. Call `FundMulticall.claimMultiple(rig, agentAddress, dayIds)`
3. Only claim completed days (day < currentDay)

```typescript
export async function executeClaim(
  walletClient: WalletClient,
  publicClient: PublicClient,
  rigState: MineRigState | FundRigState,
): Promise<`0x${string}` | null>; // null if nothing to claim
```

**Verification:** `npx tsc --noEmit`

---

### Task 7: Scoring engine

**Files:**
- Create: `packages/agents/src/scoring.ts`

**What to do:**

For each rig in the world state, score all possible actions and return the highest-scoring one.

```typescript
export type ScoredAction =
  | { type: "idle" }
  | { type: "claim"; rigState: MineRigState | FundRigState }
  | { type: "rig-action"; rigState: MineRigState | SpinRigState | FundRigState; params: RigActionParams }
  | { type: "buy"; unitAddress: `0x${string}`; lpAddress: `0x${string}`; amount: bigint }
  | { type: "sell"; unitAddress: `0x${string}`; amount: bigint }
  | { type: "auction"; rigInfo: RigInfo; auctionState: AuctionState; lpState: LPState; multicallAddress: `0x${string}` };

export function pickAction(world: WorldState, config: AgentConfig): ScoredAction;
```

**Scoring rules (priorities):**

1. **Claim (score: 90-100)** — If any rig has claimable > 0, claim it. Free value. MineRig: `accountClaimable > 0`. FundRig: `unclaimedDays.length > 0`. Always beats other actions.

2. **Rig Action (score: 30-80)** — Score based on price decay percentage:
   - `pricePercent = (price * 100) / initPrice` (how much of initPrice remains)
   - Only consider if `pricePercent < config.maxPricePercent`
   - Score = `80 - pricePercent` (lower price = higher score)
   - For MineRig: pick slot index 0 (simplest — extend later)
   - For SpinRig: also factor in prize pool size (larger pool = bonus score)
   - For FundRig: score based on emission rate vs donation cost (tokens-per-USDC)
   - Check agent has enough USDC (plus ETH for entropy fee on mine/spin)
   - `maxPrice = price * 120n / 100n` (20% slippage buffer)
   - `fundAmount` (for FundRig) = `usdcBalance * maxSpendPercent / 100`

3. **Buy (score: 20-50)** — Score when agent has USDC/DONUT but few Unit tokens for a rig:
   - Calculate `unitValue = unitBalance * unitPrice` (in DONUT terms)
   - Calculate `totalValue = donutBalance + unitValue`
   - If Unit is < 40% of total value, buy scores 20-50 (more underweight = higher)
   - Amount = `donutBalance * maxSpendPercent / 100` worth of DONUT
   - If agent has no DONUT, mint some first

4. **Sell (score: 20-50)** — Score when agent has lots of Unit tokens:
   - If Unit is > 80% of total value, sell scores 20-50
   - Amount = sell enough to get back toward 60% allocation
   - Never sell more than 20% of holdings per tick

5. **Auction (score: 40-70)** — Score when treasury has accumulated USDC and price is attractive:
   - `discount = (quoteAccumulated - lpCostInUsdc) / quoteAccumulated * 100`
   - Only consider if `discount > config.auctionMinDiscount`
   - Score = `40 + discount` (capped at 70)
   - Requires agent to have or be able to get LP tokens

Add noise: `finalScore = baseScore + random(-5, +5)` using `Math.random()`.

Return the highest-scoring action, or `{ type: "idle" }` if all scores < 15.

**Verification:** `npx tsc --noEmit`

---

### Task 8: Agent class and heartbeat loop

**Files:**
- Create: `packages/agents/src/agent.ts`

**What to do:**

The Agent class orchestrates one agent's lifecycle: setup, heartbeat, read→score→execute.

```typescript
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

export class Agent {
  name: string;
  config: AgentConfig;
  walletClient: WalletClient;
  publicClient: PublicClient;
  rigInfos: RigInfo[];  // cached rig metadata (type, unit, auction, lp addresses)
  tickCount: number;
  initialized: boolean;

  constructor(config: AgentConfig, publicClient: PublicClient) { ... }

  /** One-time setup: detect rig types, resolve unit/auction/lp addresses, mint initial tokens */
  async initialize(): Promise<void> {
    // For each rig address:
    //   1. Detect type (isDeployedRig on each Core)
    //   2. Read rigToUnit, rigToAuction, rigToLP, rigToQuote from the correct Core
    //   3. Cache as RigInfo
    //
    // Mint initial funds if balances are low:
    //   - If USDC < 1000e6, mint 10_000 USDC
    //   - If DONUT < 1000e18, mint 10_000 DONUT
    //   - (ETH must be pre-funded — can't mint ETH)
  }

  /** Single heartbeat tick */
  async tick(): Promise<void> {
    this.tickCount++;
    try {
      // 1. Read world state
      const world = await readWorldState(this.publicClient, this.address, this.rigInfos);

      // 2. Score and pick action
      const action = pickAction(world, this.config);

      // 3. Execute
      if (action.type === "idle") {
        this.log(`tick #${this.tickCount} — idle`);
        return;
      }

      this.log(`tick #${this.tickCount} — executing ${action.type}...`);
      const txHash = await this.execute(action);
      if (txHash) {
        this.log(`  tx: ${txHash}`);
      }
    } catch (err) {
      this.log(`tick #${this.tickCount} — error: ${(err as Error).message}`);
    }
  }

  /** Execute a scored action */
  private async execute(action: ScoredAction): Promise<`0x${string}` | null> {
    switch (action.type) {
      case "claim":
        return executeClaim(this.walletClient, this.publicClient, action.rigState);
      case "rig-action":
        return executeRigAction(this.walletClient, this.publicClient, action.params);
      case "buy":
        // Mint DONUT if needed, then swap
        return executeBuy(this.walletClient, this.publicClient, action.unitAddress, action.amount);
      case "sell":
        return executeSell(this.walletClient, this.publicClient, action.unitAddress, action.amount);
      case "auction":
        return executeAuctionBuy(this.walletClient, this.publicClient, action.rigInfo, action.auctionState, action.lpState, action.multicallAddress);
      default:
        return null;
    }
  }

  /** Start the heartbeat loop */
  start(): void {
    const scheduleNext = () => {
      const [min, max] = this.config.heartbeatRange;
      const delay = (min + Math.random() * (max - min)) * 1000;
      setTimeout(async () => {
        await this.tick();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    this.log("started");
  }

  private log(msg: string): void {
    console.log(`[${this.name}] ${msg}`);
  }

  get address(): `0x${string}` {
    return this.walletClient.account!.address;
  }
}
```

**Key detail:** Use `setTimeout` (not `setInterval`) so the next tick doesn't start until the current one finishes. The randomized delay between `heartbeatRange[0]` and `heartbeatRange[1]` seconds prevents agents from firing at the same time.

**Verification:** `npx tsc --noEmit`

---

### Task 9: Entry point

**Files:**
- Create: `packages/agents/src/index.ts`

**What to do:**

Load configs, create agents, initialize them, start heartbeat loops.

```typescript
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { loadAgentConfigs } from "./config";
import { Agent } from "./agent";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "https://base.llamarpc.com";
  const configs = loadAgentConfigs();

  if (configs.length === 0) {
    console.error("No agent keys configured. Set AGENT_KEYS in .env");
    process.exit(1);
  }

  console.log(`Starting ${configs.length} agent(s)...`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Target rigs: ${configs[0].rigs.join(", ")}`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const agents: Agent[] = [];

  for (const config of configs) {
    const agent = new Agent(config, publicClient);
    await agent.initialize();
    agents.push(agent);
    console.log(`  ${agent.name} (${agent.address}) initialized`);
  }

  // Start all agents
  for (const agent of agents) {
    agent.start();
  }

  console.log("All agents running. Press Ctrl+C to stop.");

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

**Verification:**
1. `cd packages/agents && npx tsc --noEmit` — no TypeScript errors
2. Create a `.env` with one test private key (funded with ETH on Base) and a rig address
3. `npm start` — should initialize, detect rig type, print agent address, and start ticking
4. First few ticks should show idle or claim actions depending on state

---

## Verification (Full System)

After all tasks are complete:

1. `cd packages/agents && npx tsc --noEmit` — zero errors
2. Set up `.env` with:
   - One private key (pre-funded with ~0.01 ETH on Base for gas)
   - One or more rig addresses that exist on-chain
3. `npm start` — agents should:
   - Initialize (detect rig types, resolve addresses, mint mock tokens)
   - Start ticking every 30-60 seconds
   - Log decisions: claim, mine/spin/fund, buy, sell, auction, or idle
   - Execute transactions on Base
4. Check the frontend — new activity should appear in the rig pages (recent mines, spins, donations, price chart movement from LP swaps)
