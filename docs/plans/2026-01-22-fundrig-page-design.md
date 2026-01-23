# FundRig Page Design

## Overview

Design for the FundRig "Fund" page - a donation-based token distribution interface where users donate to a daily pool and earn tokens proportional to their contribution. Donations support a team-selected recipient (charity/cause).

**Design principles:**
- Clean/minimal aesthetic matching MineRig/SpinRig pages
- Grayscale color scheme throughout
- Current recipient + today's pool as hero elements
- Daily pool mechanics with countdown timer

## Contract Notes

**Planned contract change:** Simplify from mapping of recipients to single `recipient` address that team can update. This removes recipient selection from UI.

**Key mechanics:**
- Daily pools - donations accumulate per day
- After day ends, users claim proportional share of that day's emission
- Emission halves every 30 days with floor minimum
- Fund split: 50% recipient, 45% treasury, 4% team, 1% protocol
- `claimMultiple` allows batch claiming in one transaction

## Page Structure

### 1. Header

Same pattern as other modals:
- X close button (left)
- "Fund" title (center)
- Empty spacer (right)

### 2. Hero Section

Current recipient + today's pool stats.

```
┌─────────────────────────────────┐
│         CURRENT RECIPIENT       │
│                                 │
│   [Avatar]  Charity Name        │
│             @handle             │
│                                 │
├─────────────────────────────────┤
│                                 │
│   Today's Pool                  │
│                                 │
│   Donated        Emission       │
│   $1,234.56      [T] 50,000     │
│                                 │
│   Current price: $0.0247/token  │  <- Donated / Emission
│                                 │
│   Day ends in 4h 32m            │  <- Countdown timer
│                                 │
└─────────────────────────────────┘
```

**Behaviors:**
- Recipient info: avatar, name, handle/description
- Today's donated amount updates in real-time
- Today's emission shows tokens available to distribute
- Current price = donated / emission (updates in real-time)
- If no donations yet, show "Be first!" or $0.00
- Countdown timer ticks down to day end

### 3. Donate Section

Custom amount input for donations.

```
┌─────────────────────────────────┐
│  Donate                         │
│                                 │
│  ┌─────────────────────────┐    │
│  │ $                    0  │    │
│  └─────────────────────────┘    │
│                                 │
│  Balance: $45.73                │
│                                 │
│  You'll receive ~2,500 [T]      │  <- Estimated tokens
│  (based on current pool share)  │
│                                 │
└─────────────────────────────────┘
```

- Custom amount input field
- Show user's payment token balance
- Show estimated token reward based on current pool share
- Estimate updates as user types

### 4. Pending Claims

Aggregated unclaimed rewards with claim all button.

```
┌─────────────────────────────────┐
│  Pending Claims                 │
│                                 │
│  [T] 12,456.78                  │  <- Total unclaimed
│  $124.56                        │
│                                 │
│  From 3 days                    │  <- Number of unclaimed days
│                                 │
│  [Claim All]                    │  <- Single button
│                                 │
└─────────────────────────────────┘
```

- Show total unclaimed tokens + USD value
- Show how many days have unclaimed rewards
- "Claim All" button uses `claimMultiple`
- Hidden if no pending claims

### 5. Your Position

2x2 grid of user stats.

```
┌─────────────────────────────────┐
│  Your position                  │
│                                 │
│  Total Donated      Today       │
│  $2,456.78          $50.00      │
│                                 │
│  Pending           Claimed      │
│  [T] 12,456        [T] 45,230   │
│  $124.56           $452.30      │
│                                 │
└─────────────────────────────────┘
```

- **Total Donated**: All-time donation amount in USD
- **Today**: Today's donation amount
- **Pending**: Unclaimed rewards (tokens + USD)
- **Claimed**: Total tokens claimed + USD value

### 6. Leaderboard

Reuse existing Leaderboard component, ranked by total tokens earned.

```
┌─────────────────────────────────┐
│  Leaderboard                    │
│                                 │
│  #1  [av] 0x1234...5678  892K   │
│  #2  [av] 0xabcd...ef01  654K   │
│  #3  [av] 0x9876...5432  421K   │
│  ...                            │
│                                 │
│  [Share your rank]              │
└─────────────────────────────────┘
```

- Top 10 by tokens earned
- Current user highlighted
- Optional share button

### 7. Recent Donations (Live Feed)

Last 10 donations from all users.

```
┌─────────────────────────────────┐
│  Recent Donations               │
│                                 │
│  [av] 0x1234...5678     2m ago  │
│       Donated $50.00            │
│       Est. ~2,500 [T]           │
│                                 │
│  [av] 0xabcd...ef01     5m ago  │
│       Donated $25.00            │
│       Est. ~1,250 [T]           │
│                                 │
│  ...                            │
└─────────────────────────────────┘
```

- Avatar, address, time ago
- Donation amount
- Estimated token reward
- New donations animate in at top
- Grayscale styling

### 8. Bottom Action Bar (Sticky)

Fixed at bottom.

```
┌─────────────────────────────────┐
│  Balance        Amount   [Fund] │
│  $45.73         $50.00          │
└─────────────────────────────────┘
```

- **Balance**: User's payment token balance
- **Amount**: Currently entered donation amount
- **Fund button**: White, disabled if no amount or insufficient balance

**Button states:**
- Enabled: "Fund" (white bg, black text)
- Disabled (no amount): "Fund" (gray bg)
- Disabled (no balance): "Fund" (gray bg)
- Processing: "Donating..." (gray bg)

## Key Behaviors

### Current Price
- Calculate: todayTotalDonated / todayEmission
- Shows effective cost per token at current pool state
- Updates in real-time as donations come in
- Price increases as more people donate (fixed emission, growing pool)

### Countdown Timer
- Shows time until current day ends
- When day ends, pool resets
- Today's donations become claimable tomorrow

### Token Estimate
- Calculate: (userAmount / (todayTotal + userAmount)) * todayEmission
- Updates in real-time as user types
- Shows "~" to indicate estimate

### Claim All
- Uses `claimMultiple` from FundMulticall
- Passes array of all unclaimed day IDs
- Single transaction for all pending rewards

### Daily Reset
- At day boundary, today's pool becomes claimable
- New day starts with fresh pool
- Emission amount may change (halving schedule)

## Component Structure

```
FundModal
├── Header (X, title)
├── HeroSection
│   ├── RecipientInfo (avatar, name, handle)
│   └── TodayPool (donated, emission, countdown)
├── DonateSection
│   ├── AmountInput
│   ├── BalanceDisplay
│   └── TokenEstimate
├── PendingClaims (if any)
│   ├── TotalPending
│   └── ClaimAllButton
├── YourPosition (2x2 grid)
├── Leaderboard (reuse existing)
├── RecentDonations (live feed)
│   └── DonationHistoryItem (per donation)
└── BottomBar (sticky)
    ├── Balance
    ├── Amount
    └── FundButton
```

## Data Requirements

### From Contract/Subgraph
- `currentDay`: Current day number
- `todayEmission`: Tokens to distribute today
- `todayTotalDonated`: Total donations today
- `startTime`: For countdown calculation
- `recipient`: Current recipient address
- `donations`: Recent donation events
- `userStats`: Total donated, today's donation, pending, claimed
- `leaderboard`: Top earners

### Real-time Updates
- Today's pool: Subscribe to Donated events
- Countdown: Calculate locally from startTime + DAY_DURATION
- Pending claims: Query `getTotalPendingRewards`

## Open Questions

1. **Recipient info**: Where does recipient metadata (name, avatar, description) come from? On-chain or off-chain?

## Implementation Notes

- Reuse existing components: Leaderboard, Avatar, NavBar, bottom bar pattern
- Create new: FundModal, RecipientInfo, DonateSection, PendingClaims, DonationHistoryItem
- Similar file structure to MineModal/SpinModal
- Contract change needed: single recipient instead of mapping
