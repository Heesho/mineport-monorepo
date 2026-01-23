# SlotRig Spin Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the SpinModal component for SlotRig - a slot machine gambling interface with live prize pool, global spin state, odds table, and spin history.

**Architecture:** Full-screen modal matching MineModal pattern. Prize pool hero with real-time ticking, spinner area showing global spin state, odds breakdown table, user stats, reused Leaderboard, and live spin feed. All grayscale.

**Tech Stack:** React 19, TypeScript, TailwindCSS, Lucide icons, existing UI components (Avatar, NavBar)

---

### Task 1: Create SpinHistoryItem Component

**Files:**
- Create: `packages/app/components/spin-history-item.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { memo } from "react";
import { formatUnits } from "viem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useBatchProfiles";
import { viewProfile } from "@/hooks/useFarcaster";

type SpinHistoryItemProps = {
  spin: {
    id: string;
    spinner: string;
    price: bigint;
    payoutPercent: number;
    won: bigint;
    timestamp: number;
  };
  timeAgo: (ts: number) => string;
  tokenSymbol?: string;
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export const SpinHistoryItem = memo(function SpinHistoryItem({
  spin,
  timeAgo,
  tokenSymbol = "TOKEN",
}: SpinHistoryItemProps) {
  const { displayName, avatarUrl, fid } = useProfile(spin.spinner);

  const handleProfileClick = () => {
    if (fid) viewProfile(fid);
  };

  const price = Number(formatUnits(spin.price, 6));
  const won = Number(formatUnits(spin.won, 18));

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={handleProfileClick}
        disabled={!fid}
        className={fid ? "cursor-pointer" : "cursor-default"}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-zinc-800 text-white text-xs">
            {spin.spinner.slice(2, 4).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleProfileClick}
            disabled={!fid}
            className={`text-sm font-medium truncate ${fid ? "hover:text-zinc-300 cursor-pointer" : "cursor-default"}`}
          >
            {displayName}
          </button>
          <span className="text-xs text-zinc-500">{timeAgo(spin.timestamp)}</span>
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          Won {spin.payoutPercent}% → {formatNumber(won)} {tokenSymbol}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-[12px] text-muted-foreground">Paid</div>
        <div className="text-[13px] font-medium">${price.toFixed(4)}</div>
      </div>
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-history-item.tsx
git commit -m "feat: add SpinHistoryItem component"
```

---

### Task 2: Create SpinModal Shell

**Files:**
- Create: `packages/app/components/spin-modal.tsx`

**Step 1: Create the modal shell with header and bottom bar**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { NavBar } from "@/components/nav-bar";

type SpinModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol?: string;
  tokenName?: string;
  userBalance?: number;
};

export function SpinModal({
  isOpen,
  onClose,
  tokenSymbol = "TOKEN",
  tokenName = "Token",
  userBalance = 0,
}: SpinModalProps) {
  const params = useParams();
  const rigAddress = (params?.address as string) || "";

  // Mock data - will be replaced with real data
  const [currentPrice, setCurrentPrice] = useState(0.0234);
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold">Spin</span>
          <div className="w-9" />
        </div>

        {/* Scrollable Content - placeholder */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 pt-4">
          <div className="text-center text-zinc-500">
            Content coming in next tasks...
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-background flex justify-center"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}
        >
          <div className="flex items-center justify-between w-full max-w-[520px] px-4 py-3">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-muted-foreground text-[12px]">Price</div>
                <div className="font-semibold text-[17px] tabular-nums">
                  ${currentPrice.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[12px]">Balance</div>
                <div className="font-semibold text-[17px] tabular-nums">
                  ${userBalance.toFixed(2)}
                </div>
              </div>
            </div>
            <button
              disabled={isSpinning || userBalance < currentPrice}
              className={`
                w-32 h-10 text-[14px] font-semibold rounded-xl transition-all
                ${isSpinning
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : userBalance >= currentPrice
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                }
              `}
            >
              {isSpinning ? "Spinning..." : "Spin"}
            </button>
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add SpinModal shell with header and bottom bar"
```

---

### Task 3: Add Prize Pool Hero Section

**Files:**
- Modify: `packages/app/components/spin-modal.tsx`

**Step 1: Add mock data and prize pool hero**

Add these state variables and mock data after existing state:

```tsx
// Add to imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Add state variables after existing ones
const [prizePool, setPrizePool] = useState(124532.45);
const [lastWinner, setLastWinner] = useState({
  address: "0x1234567890abcdef1234567890abcdef12345678",
  name: "DiamondHands",
  avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=winner",
  payoutPercent: 12,
  won: 14943,
});

// Prize pool ticking effect
useEffect(() => {
  if (!isOpen) return;

  const interval = setInterval(() => {
    setPrizePool(prev => prev + 0.1); // Simulate emissions
  }, 100);

  return () => clearInterval(interval);
}, [isOpen]);

// Price decay effect
useEffect(() => {
  if (!isOpen || isSpinning) return;

  const interval = setInterval(() => {
    setCurrentPrice(prev => Math.max(0.001, prev * 0.9995));
  }, 100);

  return () => clearInterval(interval);
}, [isOpen, isSpinning]);
```

Replace the placeholder content div with:

```tsx
{/* Scrollable Content */}
<div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4">
  {/* Prize Pool Hero */}
  <div className="text-center py-4">
    <div className="text-sm text-zinc-500 mb-1">PRIZE POOL</div>
    <div className="flex items-center justify-center gap-2 mb-1">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
        {tokenSymbol.charAt(0)}
      </div>
      <span className="text-3xl font-bold tabular-nums">
        {prizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
    <div className="text-sm text-zinc-500">
      ${(prizePool * 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  </div>

  {/* Spinner Area */}
  <div className="bg-zinc-900 rounded-xl p-4 mb-4">
    {isSpinning ? (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full" />
      </div>
    ) : (
      <div className="flex items-center gap-3 py-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={lastWinner.avatar} alt={lastWinner.name} />
          <AvatarFallback className="bg-zinc-700 text-sm">
            {lastWinner.address.slice(2, 4).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{lastWinner.name}</div>
          <div className="text-xs text-zinc-400">
            Won {lastWinner.payoutPercent}% → {lastWinner.won.toLocaleString()} {tokenSymbol}
          </div>
        </div>
        <div className="text-xs text-zinc-500">Last spin</div>
      </div>
    )}
  </div>

  {/* Current Price */}
  <div className="text-center mb-6">
    <span className="text-sm text-zinc-500">Current price: </span>
    <span className="text-sm font-medium">${currentPrice.toFixed(4)}</span>
  </div>

  {/* Placeholder for remaining sections */}
  <div className="text-center text-zinc-600 py-4">
    More sections coming...
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add prize pool hero and spinner area to SpinModal"
```

---

### Task 4: Add Odds Breakdown Table

**Files:**
- Modify: `packages/app/components/spin-modal.tsx`

**Step 1: Add odds data and table component**

Add mock odds after lastWinner state:

```tsx
const odds = [
  { chance: 50, payout: 1 },
  { chance: 25, payout: 5 },
  { chance: 15, payout: 15 },
  { chance: 8, payout: 35 },
  { chance: 2, payout: 100 },
];
```

Replace the "More sections coming..." placeholder with:

```tsx
{/* Odds Breakdown */}
<div className="mb-6">
  <div className="font-semibold text-[18px] mb-3">Odds</div>
  <div className="bg-zinc-900 rounded-xl overflow-hidden">
    {/* Header */}
    <div className="grid grid-cols-3 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800">
      <div>Chance</div>
      <div>Payout</div>
      <div className="text-right">Win</div>
    </div>
    {/* Rows */}
    {odds.map((odd, i) => {
      const winAmount = (prizePool * odd.payout) / 100;
      const isJackpot = odd.payout === 100;
      return (
        <div
          key={i}
          className={`grid grid-cols-3 px-4 py-3 text-sm ${
            isJackpot ? "bg-zinc-800/50" : ""
          } ${i < odds.length - 1 ? "border-b border-zinc-800/50" : ""}`}
        >
          <div className="font-medium">{odd.chance}%</div>
          <div className="text-zinc-400">{odd.payout}%</div>
          <div className="text-right font-medium tabular-nums flex items-center justify-end gap-1">
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[8px] text-white font-bold">
              {tokenSymbol.charAt(0)}
            </span>
            {winAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add odds breakdown table to SpinModal"
```

---

### Task 5: Add Your Position Section

**Files:**
- Modify: `packages/app/components/spin-modal.tsx`

**Step 1: Add user stats data and section**

Add mock user stats:

```tsx
const userStats = {
  spent: 564.68,
  won: 45230,
  wonUsd: 123.45,
  spins: 47,
  net: -441.23,
};
```

Add after odds breakdown:

```tsx
{/* Your Position */}
<div className="mb-6">
  <div className="font-semibold text-[18px] mb-3">Your position</div>
  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Spent</div>
      <div className="font-semibold text-[15px] tabular-nums">
        ${userStats.spent.toFixed(2)}
      </div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Won</div>
      <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
          {tokenSymbol.charAt(0)}
        </span>
        {userStats.won.toLocaleString()}
      </div>
      <div className="text-[12px] text-zinc-500">${userStats.wonUsd.toFixed(2)}</div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Spins</div>
      <div className="font-semibold text-[15px] tabular-nums">
        {userStats.spins}
      </div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Net</div>
      <div className={`font-semibold text-[15px] tabular-nums ${
        userStats.net >= 0 ? "text-white" : "text-zinc-400"
      }`}>
        {userStats.net >= 0 ? "+" : ""}${userStats.net.toFixed(2)}
      </div>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add user position stats to SpinModal"
```

---

### Task 6: Add Leaderboard Section

**Files:**
- Modify: `packages/app/components/spin-modal.tsx`

**Step 1: Add leaderboard import and data**

Add to imports:

```tsx
import { Leaderboard } from "@/components/leaderboard";
```

Add mock leaderboard data:

```tsx
const rigUrl = typeof window !== "undefined" ? `${window.location.origin}/rig/${rigAddress}` : "";

const mockLeaderboard = [
  { rank: 1, address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", mined: BigInt(892000n * 10n**18n), minedFormatted: "892K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
  { rank: 2, address: "0x1234567890abcdef1234567890abcdef12345678", mined: BigInt(654000n * 10n**18n), minedFormatted: "654K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
  { rank: 3, address: "0xabcdef1234567890abcdef1234567890abcdef12", mined: BigInt(421000n * 10n**18n), minedFormatted: "421K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
  { rank: 4, address: "0x9876543210fedcba9876543210fedcba98765432", mined: BigInt(287000n * 10n**18n), minedFormatted: "287K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
  { rank: 5, address: "0xcafebabecafebabecafebabecafebabecafebabe", mined: BigInt(156000n * 10n**18n), minedFormatted: "156K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: true, isFriend: false, profile: null },
];
```

Add after Your Position section:

```tsx
{/* Leaderboard */}
<Leaderboard
  entries={mockLeaderboard}
  userRank={5}
  tokenSymbol={tokenSymbol}
  tokenName={tokenName}
  rigUrl={rigUrl}
  isLoading={false}
/>
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add leaderboard to SpinModal"
```

---

### Task 7: Add Recent Spins Feed

**Files:**
- Modify: `packages/app/components/spin-modal.tsx`

**Step 1: Add spin history import and data**

Add to imports:

```tsx
import { SpinHistoryItem } from "@/components/spin-history-item";
```

Add mock spin history and timeAgo helper:

```tsx
function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const mockSpins = [
  { id: "1", spinner: "0x1234567890abcdef1234567890abcdef12345678", price: BigInt(2_340_000), payoutPercent: 12, won: BigInt(14943n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 120 },
  { id: "2", spinner: "0xabcdef1234567890abcdef1234567890abcdef12", price: BigInt(1_800_000), payoutPercent: 1, won: BigInt(1203n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 340 },
  { id: "3", spinner: "0x9876543210fedcba9876543210fedcba98765432", price: BigInt(3_200_000), payoutPercent: 35, won: BigInt(41234n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 890 },
  { id: "4", spinner: "0x1111222233334444555566667777888899990000", price: BigInt(950_000), payoutPercent: 5, won: BigInt(5800n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 1800 },
  { id: "5", spinner: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", price: BigInt(4_100_000), payoutPercent: 15, won: BigInt(18200n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 3600 },
];
```

Add after Leaderboard:

```tsx
{/* Recent Spins */}
<div className="mt-6 mb-6">
  <div className="font-semibold text-[18px] mb-3 px-2">Recent Spins</div>
  <div className="px-2">
    {mockSpins.map((spin) => (
      <SpinHistoryItem
        key={spin.id}
        spin={spin}
        timeAgo={timeAgo}
        tokenSymbol={tokenSymbol}
      />
    ))}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/spin-modal.tsx
git commit -m "feat: add recent spins feed to SpinModal"
```

---

### Task 8: Wire SpinModal to Rig Page

**Files:**
- Modify: `packages/app/app/rig/[address]/client-page.tsx`

**Step 1: Import SpinModal and add state**

Add to imports:

```tsx
import { SpinModal } from "@/components/spin-modal";
```

Add state variable after other modal states:

```tsx
const [showSpinModal, setShowSpinModal] = useState(false);
```

**Step 2: Add Spin button to action menu**

Find the "Mine" button in the action menu and add a "Spin" button after it:

```tsx
<button
  onClick={() => {
    setShowActionMenu(false);
    setShowSpinModal(true);
  }}
  className="w-32 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-[14px] transition-colors"
>
  Spin
</button>
```

**Step 3: Add SpinModal component at end of JSX**

Add after LiquidityModal:

```tsx
{/* Spin Modal (for SlotRig) */}
<SpinModal
  isOpen={showSpinModal}
  onClose={() => setShowSpinModal(false)}
  tokenSymbol={MOCK_TOKEN.symbol}
  tokenName={MOCK_TOKEN.name}
  userBalance={45.73}
/>
```

**Step 4: Commit**

```bash
git add packages/app/app/rig/[address]/client-page.tsx
git commit -m "feat: wire SpinModal to rig detail page"
```

---

### Task 9: Add Demo SlotRig to Explore Page

**Files:**
- Modify: `packages/app/app/explore/page.tsx`

**Step 1: Add SlotRig demo token**

Find the INITIAL_COINS array and add after the MineRig demo:

```tsx
{ address: "0xslot", name: "[Slot Rig Demo]", symbol: "SLOT", price: 0.0456, change24h: 28.3, marketCap: 345000, color: "from-purple-500 to-violet-600", sparkline: SPARKLINES.up3, lastBumped: 99500 },
```

**Step 2: Commit**

```bash
git add packages/app/app/explore/page.tsx
git commit -m "feat: add SlotRig demo token to explore page"
```

---

### Task 10: Final Cleanup and Test

**Step 1: Run dev server and test**

```bash
cd packages/app && npm run dev
```

**Step 2: Manual testing checklist**

- [ ] Navigate to explore page, see SlotRig demo token
- [ ] Click into a rig, open Actions menu
- [ ] Click "Spin" to open SpinModal
- [ ] Verify prize pool ticks up
- [ ] Verify price decays
- [ ] Verify odds table shows correct values
- [ ] Verify user position section displays
- [ ] Verify leaderboard displays
- [ ] Verify recent spins feed displays
- [ ] Close modal with X button
- [ ] Verify bottom bar shows price and balance

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete SlotRig SpinModal implementation"
```

---

## Summary

10 tasks total:
1. SpinHistoryItem component
2. SpinModal shell
3. Prize pool hero
4. Odds breakdown table
5. Your position stats
6. Leaderboard integration
7. Recent spins feed
8. Wire to rig page
9. Add explore demo
10. Final testing

Each task is ~5-10 minutes. Total implementation time: ~1-2 hours.
