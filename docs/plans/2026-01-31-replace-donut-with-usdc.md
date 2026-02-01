# Replace DONUT with USDC for LP Pairing

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace DONUT token with USDC as the LP pairing token for all rig types, simplifying the platform by removing DONUT entirely.

**Architecture:** Every `donut` reference across contracts, subgraph, and frontend becomes `usdc`. LP pairs change from Unit/DONUT (both 18 decimals) to Unit/USDC (18 vs 6 decimals). The USDC decimal difference (6 vs 18) affects price math in the Multicall contracts and subgraph. Min launch threshold changes from 1000 DONUT (18 dec) to 1 USDC (6 dec). Frontend simplifies significantly — no more CoinGecko DONUT price fetching since USDC ≈ $1.

**Tech Stack:** Solidity 0.8.19, AssemblyScript (The Graph), Next.js/TypeScript/React

**Key decimal consideration:** DONUT had 18 decimals, USDC has 6. Uniswap V2 handles this internally, but all off-chain price math must account for the difference. In Multicall contracts, `unitPrice = usdcInLP * 1e18 / unitInLP` still works because both balanceOf calls return raw amounts — the ratio naturally gives price in USDC per Unit (with 6-decimal USDC precision baked in). The subgraph needs to divide USDC reserves by 1e6 instead of 1e18.

---

## Task 1: Contract — MockDONUT → MockUSDC

**Files:**
- Modify: `packages/hardhat/contracts/mocks/MockDONUT.sol`

**Step 1: Replace MockDONUT with MockUSDC**

Rename file contents. MockUSDC must use 6 decimals (DONUT used the default 18). OpenZeppelin's ERC20 defaults to 18, so override `decimals()`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Step 2: Commit**

```bash
git add packages/hardhat/contracts/mocks/MockDONUT.sol
git commit -m "refactor: replace MockDONUT with MockUSDC (6 decimals)"
```

---

## Task 2: Contract — MineCore DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/mine/MineCore.sol`
- Modify: `packages/hardhat/contracts/rigs/mine/interfaces/IMineCore.sol`

**Step 1: Update MineCore.sol**

All renames in MineCore.sol (apply as find-replace):
- `donutToken` → `usdcToken` (immutable, constructor param, comments, NatSpec)
- `donutAmount` → `usdcAmount` (in LaunchParams struct, event, launch function, validation)
- `minDonutForLaunch` → `minUsdcForLaunch` (state var, setter, event, constructor param)
- `Core__InsufficientDonut` → `Core__InsufficientUsdc`
- `MinDonutForLaunchSet` → `MinUsdcForLaunchSet`
- All comments referencing "DONUT" → "USDC"
- `Unit/DONUT` → `Unit/USDC` in all comments

**Step 2: Update IMineCore.sol**

Same renames in the interface:
- `donutAmount` → `usdcAmount` in LaunchParams struct
- `donutToken()` → `usdcToken()` getter
- `minDonutForLaunch()` → `minUsdcForLaunch()` getter
- `setMinDonutForLaunch` → `setMinUsdcForLaunch`

**Step 3: Commit**

```bash
git add packages/hardhat/contracts/rigs/mine/MineCore.sol packages/hardhat/contracts/rigs/mine/interfaces/IMineCore.sol
git commit -m "refactor: MineCore DONUT → USDC"
```

---

## Task 3: Contract — SpinCore DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/spin/SpinCore.sol`
- Modify: `packages/hardhat/contracts/rigs/spin/interfaces/ISpinCore.sol`

**Step 1: Apply identical renames as Task 2 but for SpinCore**

- `donutToken` → `usdcToken`
- `donutAmount` → `usdcAmount`
- `minDonutForLaunch` → `minUsdcForLaunch`
- `SpinCore__InsufficientDonut` → `SpinCore__InsufficientUsdc`
- `MinDonutForLaunchSet` → `MinUsdcForLaunchSet`
- All DONUT comments → USDC

**Step 2: Update ISpinCore.sol** — same renames

**Step 3: Commit**

```bash
git add packages/hardhat/contracts/rigs/spin/SpinCore.sol packages/hardhat/contracts/rigs/spin/interfaces/ISpinCore.sol
git commit -m "refactor: SpinCore DONUT → USDC"
```

---

## Task 4: Contract — FundCore DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/fund/FundCore.sol`
- Modify: `packages/hardhat/contracts/rigs/fund/interfaces/IFundCore.sol`

**Step 1: Apply identical renames as Task 2 but for FundCore**

- `donutToken` → `usdcToken`
- `donutAmount` → `usdcAmount`
- `minDonutForLaunch` → `minUsdcForLaunch`
- `FundCore__InsufficientDonut` → `FundCore__InsufficientUsdc`
- `MinDonutForLaunchSet` → `MinUsdcForLaunchSet`
- All DONUT comments → USDC

**Step 2: Update IFundCore.sol** — same renames

**Step 3: Commit**

```bash
git add packages/hardhat/contracts/rigs/fund/FundCore.sol packages/hardhat/contracts/rigs/fund/interfaces/IFundCore.sol
git commit -m "refactor: FundCore DONUT → USDC"
```

---

## Task 5: Contract — MineMulticall DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/mine/MineMulticall.sol`

**Step 1: Rename all DONUT references**

- `address public immutable donut` → `address public immutable usdc`
- `_donut` → `_usdc` in constructor
- `accountDonutBalance` → `accountUsdcBalance` in RigState struct
- `unitPrice` comment: "Unit token price in DONUT" → "Unit token price in USDC"
- `paymentTokenPrice` comment: "LP token price in DONUT" → "LP token price in USDC"
- `paymentToken` comment: "Unit-DONUT LP" → "Unit-USDC LP"
- All `IERC20(donut)` → `IERC20(usdc)`
- `donutInLP` → `usdcInLP` in getRig and getAuction view functions
- All DONUT references in comments → USDC
- NatSpec: `@param _donut DONUT token address` → `@param _usdc USDC token address`

**Note on price math:** The `unitPrice` calculation `donutInLP * 1e18 / unitInLP` still works correctly. With USDC (6 decimals), `IERC20(usdc).balanceOf(lpToken)` returns raw 6-decimal amounts. The `* 1e18` scaling still produces a fixed-point result. The frontend already handles the conversion to display price. No math change needed.

Similarly for `paymentTokenPrice`: `IERC20(usdc).balanceOf(state.paymentToken) * 2e18 / lpTotalSupply` — same logic applies.

**Step 2: Commit**

```bash
git add packages/hardhat/contracts/rigs/mine/MineMulticall.sol
git commit -m "refactor: MineMulticall DONUT → USDC"
```

---

## Task 6: Contract — SpinMulticall DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/spin/SpinMulticall.sol`

**Step 1: Apply same renames as Task 5 for SpinMulticall**

- `donut` → `usdc` (immutable, constructor, all usages)
- `accountDonutBalance` → `accountUsdcBalance` in RigState struct
- `donutInLP` → `usdcInLP`
- All DONUT comments → USDC

**Step 2: Commit**

```bash
git add packages/hardhat/contracts/rigs/spin/SpinMulticall.sol
git commit -m "refactor: SpinMulticall DONUT → USDC"
```

---

## Task 7: Contract — FundMulticall DONUT → USDC

**Files:**
- Modify: `packages/hardhat/contracts/rigs/fund/FundMulticall.sol`

**Step 1: Apply same renames as Task 5 for FundMulticall**

- `donut` → `usdc` (immutable, constructor, all usages)
- `accountDonutBalance` → `accountUsdcBalance` in RigState struct
- `donutInLP` → `usdcInLP`
- All DONUT comments → USDC

**Step 2: Commit**

```bash
git add packages/hardhat/contracts/rigs/fund/FundMulticall.sol
git commit -m "refactor: FundMulticall DONUT → USDC"
```

---

## Task 8: Contract — Compile and fix any issues

**Step 1: Run Hardhat compile**

```bash
cd packages/hardhat && npx hardhat compile
```

Expected: Should compile cleanly. If there are errors, fix any missed renames.

**Step 2: Commit if any fixes were needed**

---

## Task 9: Deploy script — DONUT → USDC

**Files:**
- Modify: `packages/hardhat/scripts/deploy.js`

**Step 1: Update configuration section**

- Remove `DONUT_MAINNET` and `MOCK_DONUT` constants
- Remove `DONUT_ADDRESS` toggle (USDC_ADDRESS already exists)
- `MIN_DONUT_FOR_LAUNCH = convert("1000", 18)` → `MIN_USDC_FOR_LAUNCH = convert("1", 6)` (1 USDC, 6 decimals)
- Remove `donut` variable declaration
- Remove `getContractAt("MockDONUT", ...)` call in getContracts()

**Step 2: Update deploy functions**

In `deployMineCore()`, `deploySpinCore()`, `deployFundCore()`:
- Replace `DONUT_ADDRESS` → `USDC_ADDRESS` in constructor arg
- Replace `MIN_DONUT_FOR_LAUNCH` → `MIN_USDC_FOR_LAUNCH`
- Update error messages: "DONUT_ADDRESS" → "USDC_ADDRESS"

In `deployMineMulticall()`, `deploySpinMulticall()`, `deployFundMulticall()`:
- Replace `DONUT_ADDRESS` → `USDC_ADDRESS` in constructor arg

**Step 3: Update console.log and verification strings**

- All `"DONUT:"` → `"USDC:"`
- All `"Min DONUT"` → `"Min USDC"`
- `donutToken` → `usdcToken`
- `setMinDonutForLaunch` → `setMinUsdcForLaunch`

**Step 4: Update constructor args for verification**

In verification sections, replace `DONUT_ADDRESS` with `USDC_ADDRESS` and `MIN_DONUT_FOR_LAUNCH` with `MIN_USDC_FOR_LAUNCH`.

**Step 5: Commit**

```bash
git add packages/hardhat/scripts/deploy.js
git commit -m "refactor: deploy script DONUT → USDC"
```

---

## Task 10: Subgraph — Schema DONUT → USDC

**Files:**
- Modify: `packages/subgraph/schema.graphql`

**Step 1: Rename all DONUT fields**

Protocol entity:
- `totalVolumeDonut` → `totalVolumeUsdc`
- `totalLiquidityDonut` → `totalLiquidityUsdc`
- Update all comments: "DONUT" → "USDC"

Unit entity:
- `donutToken: Bytes!` → `usdcToken: Bytes!`
- `reserveDonut: BigDecimal!` → `reserveUsdc: BigDecimal!`
- `price` comment: "in DONUT" → "in USDC"
- `liquidity` comment: "DONUT in LP" → "USDC in LP"
- `volume24h/7d/Total` comments: "in DONUT" → "in USDC"
- `lpPair` comment: "Unit/DONUT" → "Unit/USDC"
- `marketCap` comment: "in DONUT" → "in USDC"

UnitHourData / UnitDayData:
- `volumeDonut` → `volumeUsdc`
- `liquidity` comment: "DONUT in LP" → "USDC in LP"
- OHLC comments: "in DONUT" → "in USDC"

Swap entity:
- `amountDonut` → `amountUsdc`
- `price` comment: "donut/unit" → "usdc/unit"

Account entity:
- `totalSwapVolume` comment: "in DONUT" → "in USDC"

**Step 2: Remove DonutToken entity entirely**

Delete the `DonutToken` entity (lines 490-498). No longer needed — USDC price is $1.

**Step 3: Commit**

```bash
git add packages/subgraph/schema.graphql
git commit -m "refactor: subgraph schema DONUT → USDC"
```

---

## Task 11: Subgraph — Constants and helpers

**Files:**
- Modify: `packages/subgraph/src/constants.ts`
- Modify: `packages/subgraph/src/helpers.ts`

**Step 1: Update constants.ts**

- `DONUT_ADDRESS` → `USDC_ADDRESS` with value `'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'` (Base mainnet USDC, lowercase)
- Update comment: "DONUT token" → "USDC token"

**Step 2: Update helpers.ts**

- `getOrCreateProtocol()`: `totalVolumeDonut` → `totalVolumeUsdc`, `totalLiquidityDonut` → `totalLiquidityUsdc`
- `createUnit()`: rename parameter `donutAddress` → `usdcAddress`, `unit.donutToken` → `unit.usdcToken`, `unit.reserveDonut` → `unit.reserveUsdc`
- `getOrCreateUnitHourData()`: `volumeDonut` → `volumeUsdc`
- `getOrCreateUnitDayData()`: `volumeDonut` → `volumeUsdc`

**Step 3: Commit**

```bash
git add packages/subgraph/src/constants.ts packages/subgraph/src/helpers.ts
git commit -m "refactor: subgraph constants/helpers DONUT → USDC"
```

---

## Task 12: Subgraph — Pair tracking (decimal fix)

**Files:**
- Modify: `packages/subgraph/src/pair.ts`

**Step 1: Fix decimal handling in handleSync**

Currently both reserves are divided by 1e18. With USDC (6 decimals), we need to detect which token is USDC and divide accordingly.

The simplest approach: since we know Unit is always 18 decimals and USDC is always 6 decimals, divide the USDC reserve by 1e6 and the Unit reserve by 1e18.

```typescript
// In handleSync, replace the reserve parsing:
let reserve0Raw = event.params.reserve0
let reserve1Raw = event.params.reserve1

let reserveUnit: BigDecimal
let reserveUsdc: BigDecimal

if (isUnitToken0) {
  reserveUnit = BigDecimal.fromString(reserve0Raw.toString()).div(BigDecimal.fromString('1000000000000000000'))  // 18 dec
  reserveUsdc = BigDecimal.fromString(reserve1Raw.toString()).div(BigDecimal.fromString('1000000'))  // 6 dec
} else {
  reserveUnit = BigDecimal.fromString(reserve1Raw.toString()).div(BigDecimal.fromString('1000000000000000000'))  // 18 dec
  reserveUsdc = BigDecimal.fromString(reserve0Raw.toString()).div(BigDecimal.fromString('1000000'))  // 6 dec
}
```

**Step 2: Rename all DONUT variables**

- `reserveDonut` → `reserveUsdc` (all occurrences)
- `amountDonutIn` → `amountUsdcIn`
- `amountDonutOut` → `amountUsdcOut`
- `amountDonut` → `amountUsdc`
- `unit.reserveDonut` → `unit.reserveUsdc`
- `unit.liquidity = reserveDonut` → `unit.liquidity = reserveUsdc`
- `hourData.liquidity = reserveDonut` → `hourData.liquidity = reserveUsdc`
- `dayData.liquidity = reserveDonut` → `dayData.liquidity = reserveUsdc`
- `hourData.volumeDonut` → `hourData.volumeUsdc`
- `dayData.volumeDonut` → `dayData.volumeUsdc`
- `swap.amountDonut` → `swap.amountUsdc`
- `unit.volumeTotal.plus(amountDonut)` → `unit.volumeTotal.plus(amountUsdc)`
- `protocol.totalVolumeDonut` → `protocol.totalVolumeUsdc`
- `account.totalSwapVolume.plus(amountDonut)` → `account.totalSwapVolume.plus(amountUsdc)`
- Comments: "Buy = DONUT in" → "Buy = USDC in", "Sell = ... DONUT out" → "Sell = ... USDC out"

**Step 3: Fix swap amount decimal handling**

In `handleSwap`, the swap amounts also need decimal-aware parsing. Currently all amounts use `BI_18`. USDC amounts should use `BI_6`:

```typescript
// Determine decimals per token
if (isUnitToken0) {
  amountUnitIn = convertTokenToDecimal(event.params.amount0In, BI_18)
  amountUnitOut = convertTokenToDecimal(event.params.amount0Out, BI_18)
  amountUsdcIn = convertTokenToDecimal(event.params.amount1In, BI_6)
  amountUsdcOut = convertTokenToDecimal(event.params.amount1Out, BI_6)
} else {
  amountUnitIn = convertTokenToDecimal(event.params.amount1In, BI_18)
  amountUnitOut = convertTokenToDecimal(event.params.amount1Out, BI_18)
  amountUsdcIn = convertTokenToDecimal(event.params.amount0In, BI_6)
  amountUsdcOut = convertTokenToDecimal(event.params.amount0Out, BI_6)
}
```

Import `BI_6` from constants (already defined there).

**Step 4: Commit**

```bash
git add packages/subgraph/src/pair.ts
git commit -m "refactor: subgraph pair tracking DONUT → USDC with 6-decimal handling"
```

---

## Task 13: Subgraph — Core event handlers

**Files:**
- Modify: `packages/subgraph/src/cores/mineCore.ts`
- Modify: `packages/subgraph/src/cores/spinCore.ts`
- Modify: `packages/subgraph/src/cores/fundCore.ts`

**Step 1: Update all three core handlers**

These files call `createUnit()` with a `donutAddress` parameter. Rename to `usdcAddress`. Update any comments referencing DONUT.

The event field names will change too (`donutAmount` → `usdcAmount` in the emitted events), so update any references to `event.params.donutAmount`.

**Step 2: Run subgraph codegen to verify**

```bash
cd packages/subgraph && yarn codegen
```

**Step 3: Build subgraph**

```bash
cd packages/subgraph && yarn build
```

**Step 4: Commit**

```bash
git add packages/subgraph/src/cores/
git commit -m "refactor: subgraph core handlers DONUT → USDC"
```

---

## Task 14: Frontend — Constants and utils cleanup

**Files:**
- Modify: `packages/app/lib/constants.ts`
- Modify: `packages/app/lib/utils.ts`
- Modify: `packages/app/lib/contracts.ts`

**Step 1: Remove DONUT price constants (constants.ts)**

- Delete `DEFAULT_DONUT_PRICE_USD = 0.001`

**Step 2: Remove DONUT price fetching (utils.ts)**

- Delete `donutPriceCache` variable
- Delete `COINGECKO_DONUT_ID` constant
- Delete entire `getDonutPrice()` function
- Remove `DEFAULT_DONUT_PRICE_USD` import

**Step 3: Update contracts.ts**

- `donut: "0xD50B69581362C60Ce39596B237C71e07Fc4F6fdA"` → `usdc: "0xe90495BE187d434e23A9B1FeC0B6Ce039700870e"` (mock USDC address, already deployed)
- In CORE_ABI: `minDonutForLaunch` → `minUsdcForLaunch`, `donutToken` → `usdcToken`
- In MULTICALL_ABI: `accountDonutBalance` → `accountUsdcBalance`, `donut` → `usdc`
- In LaunchParams: `donutAmount` → `usdcAmount`
- In RigState types: `accountDonutBalance` → `accountUsdcBalance`
- In LaunchParams type: `donutAmount` → `usdcAmount`
- Update mock token mint ABI comment

**Step 4: Commit**

```bash
git add packages/app/lib/constants.ts packages/app/lib/utils.ts packages/app/lib/contracts.ts
git commit -m "refactor: frontend constants/utils DONUT → USDC"
```

---

## Task 15: Frontend — Price hook cleanup

**Files:**
- Modify: `packages/app/hooks/usePrices.ts`

**Step 1: Remove DONUT price from hook**

- Remove `getDonutPrice` import
- Remove `DEFAULT_DONUT_PRICE_USD` import
- Remove the DONUT price query from the hook
- Remove `donutUsdPrice` from the return value
- The hook now only returns `ethUsdPrice` (or can be simplified further if ETH price is the only remaining use)

**Step 2: Commit**

```bash
git add packages/app/hooks/usePrices.ts
git commit -m "refactor: remove DONUT price from usePrices hook"
```

---

## Task 16: Frontend — Subgraph types

**Files:**
- Modify: `packages/app/lib/subgraph-launchpad.ts`

**Step 1: Rename all DONUT fields in types**

- `totalVolumeDonut` → `totalVolumeUsdc`
- `totalLiquidityDonut` → `totalLiquidityUsdc`
- `price` comment: "in DONUT" → "in USDC"
- `marketCap` comment: "in DONUT" → "in USDC"
- `liquidity` comment: "DONUT in LP" → "USDC in LP"
- `volumeDonut` → `volumeUsdc`
- `amountDonut` → `amountUsdc`

**Step 2: Update all GraphQL query strings**

All queries that reference `volumeDonut`, `totalVolumeDonut`, `totalLiquidityDonut`, `amountDonut`, `reserveDonut` → rename to USDC equivalents.

**Step 3: Commit**

```bash
git add packages/app/lib/subgraph-launchpad.ts
git commit -m "refactor: frontend subgraph types DONUT → USDC"
```

---

## Task 17: Frontend — Hook types

**Files:**
- Modify: `packages/app/hooks/useAuctions.ts`
- Modify: `packages/app/hooks/useAllRigs.ts`
- Modify: `packages/app/hooks/useUserProfile.ts`
- Modify: `packages/app/hooks/useAuctionState.ts`

**Step 1: Update comments referencing DONUT**

- `useAuctions.ts`: `paymentTokenPrice` comment "LP value in DONUT" → "LP value in USDC"
- `useAllRigs.ts`: `volume24h` comment "in DONUT" → "in USDC"
- `useUserProfile.ts`: `unitPrice` comment "price in DONUT" → "price in USDC"
- `useAuctionState.ts`: `profitLoss` comment "in DONUT equivalent" → "in USDC equivalent"

**Step 2: Commit**

```bash
git add packages/app/hooks/useAuctions.ts packages/app/hooks/useAllRigs.ts packages/app/hooks/useUserProfile.ts packages/app/hooks/useAuctionState.ts
git commit -m "refactor: frontend hook types DONUT → USDC"
```

---

## Task 18: Frontend — Launch page

**Files:**
- Modify: `packages/app/app/launch/page.tsx`

**Step 1: Remove DonutIcon component** (lines 7-8 area)

Replace with a USDC icon or simple "$" text.

**Step 2: Update defaults**

- `donutAmount: 1000` → `usdcAmount: 1` (1 USDC, will be converted to 1e6 for contract)
- All preset descriptions: "1,000 DONUT liquidity" → "$1 USDC liquidity" (or whatever default makes sense)

**Step 3: Update form state**

- `const [donutAmount, setDonutAmount]` → `const [usdcAmount, setUsdcAmount]`
- All references to `donutAmount` → `usdcAmount`
- Label: `"DONUT for LP"` → `"USDC for LP"`
- Description: `"DONUT provided for initial liquidity"` → `"USDC provided for initial liquidity"`

**Step 4: Simplify price calculations**

- Remove `donutPriceUsd = 0.001` hack
- `initialPriceDonut = donutAmount / unitAmount` → `initialPriceUsd = usdcAmount / unitAmount` (already in USD!)
- `liquidityUsd = donutAmount * donutPriceUsd * 2` → `liquidityUsd = usdcAmount * 2`

**Step 5: Update summary display**

- Replace DonutIcon renders with USDC text/icon
- "DONUT" labels → "USDC"

**Step 6: Commit**

```bash
git add packages/app/app/launch/page.tsx
git commit -m "refactor: launch page DONUT → USDC"
```

---

## Task 19: Frontend — Rig detail page

**Files:**
- Modify: `packages/app/app/rig/[address]/client-page.tsx`

**Step 1: Remove donutUsdPrice dependency**

- Remove `const { donutUsdPrice } = usePrices()` import and call
- Price calculation simplifies: `Number(formatEther(unitPrice))` is already the USD price (since USDC ≈ $1)
  - **Important decimal note:** `unitPrice` from Multicall is `usdcInLP * 1e18 / unitInLP`. Since USDC has 6 decimals, `usdcInLP` is a raw 6-decimal number. So `unitPrice` is actually `(rawUsdc * 1e18) / rawUnit`. When formatted with `formatEther` (divides by 1e18), we get `rawUsdc / rawUnit`. Since `rawUsdc` is 6-decimal and `rawUnit` is 18-decimal, the actual USD price = `formatEther(unitPrice) * 1e12`. Need to account for this or change the Multicall math.

  **CORRECTION:** Actually, re-examining the Multicall: `IERC20(usdc).balanceOf(lpToken)` returns raw USDC amount (6 dec). `IERC20(unitToken).balanceOf(lpToken)` returns raw Unit amount (18 dec). So `unitPrice = rawUsdc * 1e18 / rawUnit`. When you `formatEther(unitPrice)` you get `rawUsdc / rawUnit`. If there's 1000 USDC (= 1000e6 raw) and 1000000 Unit (= 1000000e18 raw), `unitPrice = 1000e6 * 1e18 / 1000000e18 = 1000e6 / 1000000 = 1000`. `formatEther(1000)` = 0.000000000000001. That's wrong.

  **The fix:** The Multicall price calculation needs to account for USDC's 6 decimals. Change in Multicall contracts:
  `state.unitPrice = unitInLP == 0 ? 0 : usdcInLP * 1e30 / unitInLP;`
  This gives `rawUsdc * 1e30 / rawUnit`. With 1000 USDC and 1000000 Unit: `1000e6 * 1e30 / 1000000e18 = 1e39 / 1e24 = 1e15`. `formatEther(1e15)` = 0.001. That's $0.001 per Unit. Correct!

  Alternatively (simpler): `state.unitPrice = unitInLP == 0 ? 0 : usdcInLP * 1e12 * 1e18 / unitInLP;` — multiply USDC by 1e12 to normalize to 18 decimals first, then the rest is the same as before.

  **UPDATE TASKS 5-7:** Add `* 1e12` to normalize USDC to 18 decimals in both `unitPrice` and `paymentTokenPrice` calculations. This way the frontend doesn't need to change its parsing at all.

**Step 2: Replace LP pair label**

- `{tokenSymbol}-DONUT LP` → `{tokenSymbol}-USDC LP`

**Step 3: Remove donut balance tracking**

- Remove `accountDonutBalance` references → `accountUsdcBalance` (or remove entirely since USDC balance is already tracked as quote token balance in most cases)
- Remove `userDonutBalance` calculation
- Update liquidity modal props: remove `donutBalance`, `donutPrice`

**Step 4: Commit**

```bash
git add packages/app/app/rig/[address]/client-page.tsx
git commit -m "refactor: rig page DONUT → USDC"
```

---

## Task 20: Frontend — Components cleanup

**Files:**
- Modify: `packages/app/components/slot-card.tsx`
- Modify: `packages/app/components/slot-miner-info.tsx`
- Modify: `packages/app/components/slot-selector.tsx`
- Modify: `packages/app/components/rig-card.tsx`
- Modify: `packages/app/components/mine-modal.tsx`
- Modify: `packages/app/components/spin-modal.tsx`
- Modify: `packages/app/components/liquidity-modal.tsx`
- Modify: `packages/app/components/trade-modal.tsx`
- Modify: `packages/app/components/mine-history-item.tsx`

**Step 1: slot-card.tsx**

- Remove `donutUsdPrice` prop — price from subgraph is already USD
- Simplify `glazedUsd` calculation: no more `* donutUsdPrice` multiplier

**Step 2: slot-miner-info.tsx**

- Remove `donutUsdPrice` prop
- Simplify price calculations

**Step 3: slot-selector.tsx**

- Remove `donutUsdPrice` prop passthrough

**Step 4: rig-card.tsx**

- Remove `donutUsdPrice` prop

**Step 5: mine-modal.tsx**

- `{formatTokenAmount(rigState.unitPrice)} DONUT` → `${formatTokenAmount(rigState.unitPrice)}` or similar USD display

**Step 6: spin-modal.tsx**

- Update comment about unitPrice: "DONUT/unit ratio" → "USDC/unit ratio"

**Step 7: liquidity-modal.tsx**

- Remove `donutBalance`, `donutPrice` props
- `tokenSymbol = "DONUT"` default → `tokenSymbol = "USDC"`
- `tokenName = "Donut"` default → `tokenName = "USDC"`
- Simplify: no more DONUT calculations, required amount is just USDC
- Remove DONUT sufficiency checks
- Remove DONUT section in form
- The modal now just shows the USDC needed for LP

**Step 8: trade-modal.tsx**

- `CONTRACT_ADDRESSES.donut` → `CONTRACT_ADDRESSES.usdc` in swap path
- Comments: "via DONUT intermediate" → "via USDC intermediate" (or remove if direct)

**Step 9: mine-history-item.tsx**

- `tokenSymbol = "DONUT"` default → `tokenSymbol = "USDC"`

**Step 10: Commit**

```bash
git add packages/app/components/
git commit -m "refactor: all components DONUT → USDC"
```

---

## Task 21: Frontend — Profile and auctions pages

**Files:**
- Modify: `packages/app/app/profile/page.tsx`
- Modify: `packages/app/app/auctions/page.tsx`
- Modify: `packages/app/app/info/page.tsx`

**Step 1: profile/page.tsx**

- Remove DonutIcon component
- Remove `donutUsdPrice` from usePrices hook
- Remove DONUT balance fetching (`useReadContract` for DONUT balance)
- Remove DONUT mint button and minting logic
- Remove DONUT from portfolio value calculation (`donutValueUsd`)
- Remove entire "DONUT balance" card section
- Keep USDC balance display (already exists separately)

**Step 2: auctions/page.tsx**

- `{selectedAuction.tokenSymbol}-DONUT LP` → `{selectedAuction.tokenSymbol}-USDC LP`

**Step 3: info/page.tsx**

- `"All tokens paired with DONUT for deep liquidity"` → `"All tokens paired with USDC for deep liquidity"`

**Step 4: Commit**

```bash
git add packages/app/app/profile/page.tsx packages/app/app/auctions/page.tsx packages/app/app/info/page.tsx
git commit -m "refactor: profile/auctions/info pages DONUT → USDC"
```

---

## Task 22: Frontend — Dune dashboard link

**Files:**
- Modify: `packages/app/components/dune-dashboard-button.tsx`

**Step 1: Update or remove Dune link**

- The current link points to `dune.com/xyk/donut-company` — this may no longer be relevant. Either update the URL or leave as-is if the dashboard still applies.

**Step 2: Commit if changed**

---

## Task 23: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Replace all DONUT references**

- "paired with DONUT" → "paired with USDC"
- `donutAmount` → `usdcAmount` in all parameter descriptions
- "DONUT provided for initial LP" → "USDC provided for initial LP"
- "minimum amount of DONUT" → "minimum amount of USDC"
- "coin-donut LP" → "coin-USDC LP"
- Remove any mention of DONUT token requirement

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md DONUT → USDC"
```

---

## Task 24: Agents package (if exists)

**Files:**
- Modify: `packages/agents/src/actions/swap.ts`
- Modify: `packages/agents/src/actions/auction.ts`
- Modify: `packages/agents/src/agent.ts`
- Modify: `packages/agents/src/scoring.ts`
- Modify: `packages/agents/src/state.ts`

**Step 1: Rename all DONUT references to USDC**

These files reference DONUT for swap operations, balance checks, minting, and LP reserve logic. Apply the same mechanical renames.

**Step 2: Commit**

```bash
git add packages/agents/
git commit -m "refactor: agents package DONUT → USDC"
```

---

## Task 25: Contract tests

**Files:**
- Modify: All test files in `packages/hardhat/tests/` that reference DONUT

Test files affected:
- `tests/fund/testCore.js`
- `tests/slot/testCore.js`
- `tests/mine/testComprehensive.js`
- `tests/mine/testRigorous.js`
- `tests/mine/testRig.js`
- `tests/mine/testFactory.js`
- `tests/mine/testRigExploits.js`
- `tests/mine/testMulticallOnly.js`
- `tests/mine/testBusinessLogic.js`
- `tests/security/testEdgeCases.js`
- `tests/security/testExploits.js`

**Step 1: Update all test files**

- `MockDONUT` → `MockUSDC`
- `donut` variable → `usdc`
- `donutAmount` → `usdcAmount`
- `minDonutForLaunch` → `minUsdcForLaunch`
- `setMinDonutForLaunch` → `setMinUsdcForLaunch`
- `donutToken` → `usdcToken`
- Amount values: adjust for 6 decimals instead of 18. E.g., `convert("1000", 18)` for DONUT → `convert("1", 6)` for USDC (or whatever test amount is appropriate)

**Step 2: Run tests**

```bash
cd packages/hardhat && npx hardhat test
```

**Step 3: Fix any failures**

**Step 4: Commit**

```bash
git add packages/hardhat/tests/
git commit -m "refactor: contract tests DONUT → USDC"
```

---

## Task 26: Final verification

**Step 1: Search for any remaining DONUT references**

```bash
grep -ri "donut" packages/ --include="*.sol" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.graphql" | grep -v node_modules | grep -v ".next" | grep -v "generated"
```

Fix any stragglers.

**Step 2: Compile contracts**

```bash
cd packages/hardhat && npx hardhat compile
```

**Step 3: Run contract tests**

```bash
cd packages/hardhat && npx hardhat test
```

**Step 4: Build subgraph**

```bash
cd packages/subgraph && yarn codegen && yarn build
```

**Step 5: Build frontend**

```bash
cd packages/app && npm run build
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "refactor: complete DONUT → USDC migration"
```

---

## IMPORTANT: Decimal correction for Multicall contracts (amends Tasks 5-7)

The price calculations in all three Multicall contracts need a decimal normalization factor. Since USDC has 6 decimals (not 18 like DONUT), multiply the USDC balance by `1e12` before dividing by the Unit balance:

**unitPrice calculation (in getRig functions):**
```solidity
// Old (DONUT, 18 dec): donutInLP * 1e18 / unitInLP
// New (USDC, 6 dec):   usdcInLP * 1e12 * 1e18 / unitInLP = usdcInLP * 1e30 / unitInLP
state.unitPrice = unitInLP == 0 ? 0 : usdcInLP * 1e30 / unitInLP;
```

**paymentTokenPrice calculation (in getAuction functions):**
```solidity
// Old: IERC20(donut).balanceOf(state.paymentToken) * 2e18 / lpTotalSupply
// New: IERC20(usdc).balanceOf(state.paymentToken) * 2e30 / lpTotalSupply
state.paymentTokenPrice =
    lpTotalSupply == 0 ? 0 : IERC20(usdc).balanceOf(state.paymentToken) * 2e30 / lpTotalSupply;
```

This ensures `formatEther(unitPrice)` on the frontend still gives the correct USD price without any frontend math changes.
