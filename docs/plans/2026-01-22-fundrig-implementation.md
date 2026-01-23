# FundRig Fund Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the FundModal component for FundRig - a donation-based token distribution interface with daily pools, recipient display, donation input, claim aggregation, and donation history.

**Architecture:** Full-screen modal matching MineModal/SpinModal pattern. Hero section with recipient info + today's pool stats, donation input with token estimate, pending claims section, user stats, reused Leaderboard, and live donation feed. All grayscale.

**Tech Stack:** React 19, TypeScript, TailwindCSS, Lucide icons, existing UI components (Avatar, NavBar, Leaderboard)

---

### Task 1: Create DonationHistoryItem Component

**Files:**
- Create: `packages/app/components/donation-history-item.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { memo } from "react";
import { formatUnits } from "viem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useBatchProfiles";
import { viewProfile } from "@/hooks/useFarcaster";

type DonationHistoryItemProps = {
  donation: {
    id: string;
    donor: string;
    amount: bigint;
    estimatedTokens: bigint;
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

export const DonationHistoryItem = memo(function DonationHistoryItem({
  donation,
  timeAgo,
  tokenSymbol = "TOKEN",
}: DonationHistoryItemProps) {
  const { displayName, avatarUrl, fid } = useProfile(donation.donor);

  const handleProfileClick = () => {
    if (fid) viewProfile(fid);
  };

  const amount = Number(formatUnits(donation.amount, 6));
  const tokens = Number(formatUnits(donation.estimatedTokens, 18));

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
            {donation.donor.slice(2, 4).toUpperCase()}
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
          <span className="text-xs text-zinc-500">{timeAgo(donation.timestamp)}</span>
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          Donated ${amount.toFixed(2)} → ~{formatNumber(tokens)} {tokenSymbol}
        </div>
      </div>
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add packages/app/components/donation-history-item.tsx
git commit -m "feat: add DonationHistoryItem component"
```

---

### Task 2: Create FundModal Shell

**Files:**
- Create: `packages/app/components/fund-modal.tsx`

**Step 1: Create the modal shell with header and bottom bar**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavBar } from "@/components/nav-bar";

type FundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol?: string;
  tokenName?: string;
  userBalance?: number;
};

export function FundModal({
  isOpen,
  onClose,
  tokenSymbol = "TOKEN",
  tokenName = "Token",
  userBalance = 0,
}: FundModalProps) {
  const params = useParams();
  const rigAddress = (params?.address as string) || "";

  // Mock data - will be replaced with real data
  const [donationAmount, setDonationAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(donationAmount) || 0;

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
          <span className="text-base font-semibold">Fund</span>
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
                <div className="text-muted-foreground text-[12px]">Balance</div>
                <div className="font-semibold text-[17px] tabular-nums">
                  ${userBalance.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[12px]">Amount</div>
                <div className="font-semibold text-[17px] tabular-nums">
                  ${parsedAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <button
              disabled={isDonating || parsedAmount <= 0 || parsedAmount > userBalance}
              className={`
                w-32 h-10 text-[14px] font-semibold rounded-xl transition-all
                ${isDonating
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : parsedAmount > 0 && parsedAmount <= userBalance
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                }
              `}
            >
              {isDonating ? "Donating..." : "Fund"}
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
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add FundModal shell with header and bottom bar"
```

---

### Task 3: Add Hero Section (Recipient + Today's Pool)

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

**Step 1: Add mock data and hero section**

Add state variables after existing state:

```tsx
// Mock recipient data
const recipient = {
  address: "0xcharity1234567890abcdef1234567890abcdef",
  name: "Ocean Cleanup Foundation",
  avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=ocean",
  handle: "@oceancleanup",
};

// Mock today's pool data
const [todayDonated, setTodayDonated] = useState(1234.56);
const [todayEmission, setTodayEmission] = useState(50000);
const [dayEndsIn, setDayEndsIn] = useState(4 * 3600 + 32 * 60); // seconds

// Calculate current price per token
const currentPricePerToken = todayDonated > 0 ? todayDonated / todayEmission : 0;

// Countdown timer effect
useEffect(() => {
  if (!isOpen) return;

  const interval = setInterval(() => {
    setDayEndsIn(prev => Math.max(0, prev - 1));
  }, 1000);

  return () => clearInterval(interval);
}, [isOpen]);

// Format countdown
function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
```

Replace the placeholder content div with:

```tsx
{/* Scrollable Content */}
<div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4">
  {/* Hero: Current Recipient */}
  <div className="text-center py-4">
    <div className="text-sm text-zinc-500 mb-2">CURRENT RECIPIENT</div>
    <div className="flex items-center justify-center gap-3 mb-1">
      <Avatar className="h-12 w-12">
        <AvatarImage src={recipient.avatar} alt={recipient.name} />
        <AvatarFallback className="bg-zinc-700 text-sm">
          {recipient.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="text-left">
        <div className="text-lg font-semibold">{recipient.name}</div>
        <div className="text-sm text-zinc-500">{recipient.handle}</div>
      </div>
    </div>
  </div>

  {/* Hero: Today's Pool */}
  <div className="bg-zinc-900 rounded-xl p-4 mb-4">
    <div className="text-sm text-zinc-500 mb-3">Today's Pool</div>
    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <div className="text-xs text-zinc-500 mb-1">Donated</div>
        <div className="text-xl font-bold tabular-nums">
          ${todayDonated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-1">Emission</div>
        <div className="text-xl font-bold tabular-nums flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
            {tokenSymbol.charAt(0)}
          </span>
          {todayEmission.toLocaleString()}
        </div>
      </div>
    </div>
    <div className="text-sm text-zinc-400 mb-2">
      Current price: {currentPricePerToken > 0 ? `$${currentPricePerToken.toFixed(6)}/token` : "Be first!"}
    </div>
    <div className="text-sm text-zinc-500">
      Day ends in <span className="text-white font-medium">{formatCountdown(dayEndsIn)}</span>
    </div>
  </div>

  {/* Placeholder for remaining sections */}
  <div className="text-center text-zinc-600 py-4">
    More sections coming...
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add hero section with recipient and today's pool to FundModal"
```

---

### Task 4: Add Donate Section

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

**Step 1: Add donate section after hero**

Calculate estimated tokens:

```tsx
// Calculate estimated tokens for current input
const estimatedTokens = parsedAmount > 0 && todayEmission > 0
  ? (parsedAmount / (todayDonated + parsedAmount)) * todayEmission
  : 0;
```

Add after Today's Pool section:

```tsx
{/* Donate Section */}
<div className="mb-6">
  <div className="font-semibold text-[18px] mb-3">Donate</div>
  <div className="bg-zinc-900 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl text-zinc-400">$</span>
      <input
        type="number"
        value={donationAmount}
        onChange={(e) => setDonationAmount(e.target.value)}
        placeholder="0.00"
        className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-600 tabular-nums"
      />
    </div>
    <div className="text-sm text-zinc-500 mb-2">
      Balance: ${userBalance.toFixed(2)}
    </div>
    {parsedAmount > 0 && (
      <div className="text-sm text-zinc-400">
        You'll receive ~{estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tokenSymbol}
        <span className="text-zinc-600 ml-1">(based on current pool)</span>
      </div>
    )}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add donate section with token estimate to FundModal"
```

---

### Task 5: Add Pending Claims Section

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

**Step 1: Add pending claims data and section**

Add mock data:

```tsx
const pendingClaims = {
  totalTokens: 12456.78,
  totalUsd: 124.56,
  unclaimedDays: 3,
};
const [isClaiming, setIsClaiming] = useState(false);
```

Add after Donate Section:

```tsx
{/* Pending Claims */}
{pendingClaims.unclaimedDays > 0 && (
  <div className="mb-6">
    <div className="font-semibold text-[18px] mb-3">Pending Claims</div>
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold tabular-nums flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
              {tokenSymbol.charAt(0)}
            </span>
            {pendingClaims.totalTokens.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-zinc-500">${pendingClaims.totalUsd.toFixed(2)}</div>
          <div className="text-xs text-zinc-600 mt-1">From {pendingClaims.unclaimedDays} days</div>
        </div>
        <button
          onClick={() => setIsClaiming(true)}
          disabled={isClaiming}
          className={`
            px-6 py-2.5 text-[14px] font-semibold rounded-xl transition-all
            ${isClaiming
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-white text-black hover:bg-zinc-200"
            }
          `}
        >
          {isClaiming ? "Claiming..." : "Claim All"}
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add pending claims section to FundModal"
```

---

### Task 6: Add Your Position Section

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

**Step 1: Add user stats data and section**

Add mock data:

```tsx
const userStats = {
  totalDonated: 2456.78,
  todayDonation: 50.00,
  pendingTokens: 12456,
  pendingUsd: 124.56,
  claimedTokens: 45230,
  claimedUsd: 452.30,
};
```

Add after Pending Claims:

```tsx
{/* Your Position */}
<div className="mb-6">
  <div className="font-semibold text-[18px] mb-3">Your position</div>
  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Total Donated</div>
      <div className="font-semibold text-[15px] tabular-nums">
        ${userStats.totalDonated.toFixed(2)}
      </div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Today</div>
      <div className="font-semibold text-[15px] tabular-nums">
        ${userStats.todayDonation.toFixed(2)}
      </div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Pending</div>
      <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
          {tokenSymbol.charAt(0)}
        </span>
        {userStats.pendingTokens.toLocaleString()}
      </div>
      <div className="text-[12px] text-zinc-500">${userStats.pendingUsd.toFixed(2)}</div>
    </div>
    <div>
      <div className="text-muted-foreground text-[12px] mb-1">Claimed</div>
      <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
          {tokenSymbol.charAt(0)}
        </span>
        {userStats.claimedTokens.toLocaleString()}
      </div>
      <div className="text-[12px] text-zinc-500">${userStats.claimedUsd.toFixed(2)}</div>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add user position stats to FundModal"
```

---

### Task 7: Add Leaderboard Section

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

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
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add leaderboard to FundModal"
```

---

### Task 8: Add Recent Donations Feed

**Files:**
- Modify: `packages/app/components/fund-modal.tsx`

**Step 1: Add donation history import and data**

Add to imports:

```tsx
import { DonationHistoryItem } from "@/components/donation-history-item";
```

Add mock donations and timeAgo helper:

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

const mockDonations = [
  { id: "1", donor: "0x1234567890abcdef1234567890abcdef12345678", amount: BigInt(50_000_000), estimatedTokens: BigInt(2500n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 120 },
  { id: "2", donor: "0xabcdef1234567890abcdef1234567890abcdef12", amount: BigInt(25_000_000), estimatedTokens: BigInt(1250n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 340 },
  { id: "3", donor: "0x9876543210fedcba9876543210fedcba98765432", amount: BigInt(100_000_000), estimatedTokens: BigInt(5000n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 890 },
  { id: "4", donor: "0x1111222233334444555566667777888899990000", amount: BigInt(10_000_000), estimatedTokens: BigInt(500n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 1800 },
  { id: "5", donor: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amount: BigInt(75_000_000), estimatedTokens: BigInt(3750n * 10n**18n), timestamp: Math.floor(Date.now() / 1000) - 3600 },
];
```

Replace the placeholder div with the donations feed (add after Leaderboard):

```tsx
{/* Recent Donations */}
<div className="mt-6 mb-6">
  <div className="font-semibold text-[18px] mb-3 px-2">Recent Donations</div>
  <div className="px-2">
    {mockDonations.map((donation) => (
      <DonationHistoryItem
        key={donation.id}
        donation={donation}
        timeAgo={timeAgo}
        tokenSymbol={tokenSymbol}
      />
    ))}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add packages/app/components/fund-modal.tsx
git commit -m "feat: add recent donations feed to FundModal"
```

---

### Task 9: Wire FundModal to Rig Page

**Files:**
- Modify: `packages/app/app/rig/[address]/client-page.tsx`

**Step 1: Import FundModal and add state**

Add to imports:

```tsx
import { FundModal } from "@/components/fund-modal";
```

Add state variable after other modal states:

```tsx
const [showFundModal, setShowFundModal] = useState(false);
```

**Step 2: Add Fund button to action menu**

Find the "Spin" button in the action menu and add a "Fund" button after it:

```tsx
<button
  onClick={() => {
    setShowActionMenu(false);
    setShowFundModal(true);
  }}
  className="w-32 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-[14px] transition-colors"
>
  Fund
</button>
```

**Step 3: Add FundModal component at end of JSX**

Add after SpinModal:

```tsx
{/* Fund Modal (for FundRig) */}
<FundModal
  isOpen={showFundModal}
  onClose={() => setShowFundModal(false)}
  tokenSymbol={MOCK_TOKEN.symbol}
  tokenName={MOCK_TOKEN.name}
  userBalance={45.73}
/>
```

**Step 4: Commit**

```bash
git add packages/app/app/rig/[address]/client-page.tsx
git commit -m "feat: wire FundModal to rig detail page"
```

---

### Task 10: Add Demo FundRig to Explore Page

**Files:**
- Modify: `packages/app/app/explore/page.tsx`

**Step 1: Add FundRig demo token**

Find the INITIAL_COINS array and add after the SlotRig demo:

```tsx
{ address: "0xfund", name: "[Fund Rig Demo]", symbol: "FUND", price: 0.0123, change24h: 15.7, marketCap: 456000, color: "from-pink-500 to-rose-600", sparkline: SPARKLINES.up2, lastBumped: 99000 },
```

**Step 2: Commit**

```bash
git add packages/app/app/explore/page.tsx
git commit -m "feat: add FundRig demo token to explore page"
```

---

### Task 11: Final Cleanup and Test

**Step 1: Run dev server and test**

```bash
cd packages/app && npm run dev
```

**Step 2: Manual testing checklist**

- [ ] Navigate to explore page, see FundRig demo token
- [ ] Click into a rig, open Actions menu
- [ ] Click "Fund" to open FundModal
- [ ] Verify recipient info displays
- [ ] Verify today's pool stats display
- [ ] Verify countdown timer ticks
- [ ] Verify current price per token shows
- [ ] Enter donation amount, verify token estimate updates
- [ ] Verify pending claims section displays
- [ ] Verify user position stats display
- [ ] Verify leaderboard displays
- [ ] Verify recent donations feed displays
- [ ] Close modal with X button
- [ ] Verify bottom bar shows balance and amount

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete FundRig FundModal implementation"
```

---

## Summary

11 tasks total:
1. DonationHistoryItem component
2. FundModal shell
3. Hero section (recipient + pool)
4. Donate section
5. Pending claims section
6. Your position stats
7. Leaderboard integration
8. Recent donations feed
9. Wire to rig page
10. Add explore demo
11. Final testing

Each task is ~5-10 minutes. Total implementation time: ~1-2 hours.
