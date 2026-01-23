"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavBar } from "@/components/nav-bar";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardEntry } from "@/hooks/useRigLeaderboard";
import { DonationHistoryItem } from "@/components/donation-history-item";

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
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const pendingClaims = {
    totalTokens: 12456.78,
    totalUsd: 124.56,
    unclaimedDays: 3,
  };

  // Mock user stats
  const userStats = {
    totalFunded: 2456.78,
    todayFunding: 50.00,
    pendingTokens: 12456,
    pendingUsd: 124.56,
    claimedTokens: 45230,
    claimedUsd: 452.30,
  };

  // Mock leaderboard data
  const leaderboardEntries: LeaderboardEntry[] = [
    { rank: 1, address: "0x1234567890abcdef1234567890abcdef12345678", mined: BigInt(892000e18), minedFormatted: "892K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(892000e18), earnedFormatted: "892K", isCurrentUser: false, isFriend: false },
    { rank: 2, address: "0xabcdef1234567890abcdef1234567890abcdef12", mined: BigInt(654000e18), minedFormatted: "654K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(654000e18), earnedFormatted: "654K", isCurrentUser: false, isFriend: true },
    { rank: 3, address: "0x9876543210fedcba9876543210fedcba98765432", mined: BigInt(421000e18), minedFormatted: "421K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(421000e18), earnedFormatted: "421K", isCurrentUser: false, isFriend: false },
    { rank: 4, address: "0xfedcba9876543210fedcba9876543210fedcba98", mined: BigInt(312000e18), minedFormatted: "312K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(312000e18), earnedFormatted: "312K", isCurrentUser: true, isFriend: false },
    { rank: 5, address: "0x5678901234abcdef5678901234abcdef56789012", mined: BigInt(198000e18), minedFormatted: "198K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(198000e18), earnedFormatted: "198K", isCurrentUser: false, isFriend: false },
  ];
  const userRank = 4;

  // Mock recent donations
  const now = Math.floor(Date.now() / 1000);
  const recentDonations = [
    { id: "1", donor: "0x1234567890abcdef1234567890abcdef12345678", amount: BigInt(50e6), estimatedTokens: BigInt(2500e18), timestamp: now - 120 },
    { id: "2", donor: "0xabcdef1234567890abcdef1234567890abcdef12", amount: BigInt(25e6), estimatedTokens: BigInt(1250e18), timestamp: now - 300 },
    { id: "3", donor: "0x9876543210fedcba9876543210fedcba98765432", amount: BigInt(100e6), estimatedTokens: BigInt(4800e18), timestamp: now - 600 },
    { id: "4", donor: "0xfedcba9876543210fedcba9876543210fedcba98", amount: BigInt(10e6), estimatedTokens: BigInt(500e18), timestamp: now - 1800 },
    { id: "5", donor: "0x5678901234abcdef5678901234abcdef56789012", amount: BigInt(75e6), estimatedTokens: BigInt(3600e18), timestamp: now - 3600 },
  ];

  // Time ago helper
  function timeAgo(timestamp: number): string {
    const seconds = now - timestamp;
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Mock recipient data
  const recipient = {
    address: "0xcharity1234567890abcdef1234567890abcdef",
    name: "Ocean Cleanup Foundation",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=ocean",
    handle: "@oceancleanup",
  };

  // Mock today's pool data
  const [todayFunded, setTodayFunded] = useState(1234.56);
  const [todayEmission, setTodayEmission] = useState(50000);
  const [dayEndsIn, setDayEndsIn] = useState(4 * 3600 + 32 * 60); // seconds

  // Calculate current price per token
  const currentPricePerToken = todayFunded > 0 ? todayFunded / todayEmission : 0;

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

  if (!isOpen) return null;

  const parsedAmount = parseFloat(fundAmount) || 0;

  // Calculate estimated tokens for current input
  const estimatedTokens = parsedAmount > 0 && todayEmission > 0
    ? (parsedAmount / (todayFunded + parsedAmount)) * todayEmission
    : 0;

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

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4">
          {/* Hero: Current Recipient */}
          <div className="text-center py-4">
            <div className="text-[12px] text-muted-foreground mb-2">CURRENT RECIPIENT</div>
            <div className="flex items-center justify-center gap-3 mb-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={recipient.avatar} alt={recipient.name} />
                <AvatarFallback className="bg-zinc-700 text-sm">
                  {recipient.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-lg font-semibold">{recipient.name}</div>
                <div className="text-[13px] text-muted-foreground">{recipient.handle}</div>
              </div>
            </div>
          </div>

          {/* Today's Pool Stats */}
          <div className="mb-6">
            <div className="font-semibold text-[18px] mb-3">Today's Pool</div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-3">
              <div>
                <div className="text-muted-foreground text-[12px] mb-1">Funded</div>
                <div className="font-semibold text-[15px] tabular-nums">
                  ${todayFunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[12px] mb-1">Emission</div>
                <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
                    {tokenSymbol.charAt(0)}
                  </span>
                  {todayEmission.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-[13px] text-muted-foreground mb-1">
              Current price: {currentPricePerToken > 0 ? `$${currentPricePerToken.toFixed(6)}/token` : "Be first!"}
            </div>
            <div className="text-[13px] text-muted-foreground">
              Day ends in <span className="text-foreground font-medium">{formatCountdown(dayEndsIn)}</span>
            </div>
          </div>

          {/* Fund Input */}
          <div className="mb-6">
            <div className="font-semibold text-[18px] mb-3">Fund</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl text-muted-foreground">$</span>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-600 tabular-nums"
              />
            </div>
            <div className="text-[13px] text-muted-foreground mb-1">
              Balance: ${userBalance.toFixed(2)}
            </div>
            {parsedAmount > 0 && (
              <div className="text-[13px] text-muted-foreground">
                You'll receive ~{estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tokenSymbol}
                <span className="text-zinc-600 ml-1">(based on current pool)</span>
              </div>
            )}
          </div>

          {/* Pending Claims */}
          {pendingClaims.unclaimedDays > 0 && (
            <div className="mb-6">
              <div className="font-semibold text-[18px] mb-3">Pending Claims</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
                      {tokenSymbol.charAt(0)}
                    </span>
                    {pendingClaims.totalTokens.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[12px] text-muted-foreground">${pendingClaims.totalUsd.toFixed(2)} · {pendingClaims.unclaimedDays} days</div>
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
          )}

          {/* Your Position */}
          <div className="mb-6">
            <div className="font-semibold text-[18px] mb-3">Your position</div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <div className="text-muted-foreground text-[12px] mb-1">Total funded</div>
                <div className="font-semibold text-[15px] tabular-nums">
                  ${userStats.totalFunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[12px] mb-1">Today</div>
                <div className="font-semibold text-[15px] tabular-nums">
                  ${userStats.todayFunding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div className="text-[12px] text-muted-foreground">${userStats.pendingUsd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[12px] mb-1">Claimed</div>
                <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[10px] text-white font-semibold">
                    {tokenSymbol.charAt(0)}
                  </span>
                  {userStats.claimedTokens.toLocaleString()}
                </div>
                <div className="text-[12px] text-muted-foreground">${userStats.claimedUsd.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <Leaderboard
            entries={leaderboardEntries}
            userRank={userRank}
            tokenSymbol={tokenSymbol}
            tokenName={tokenName}
            rigUrl={`https://mineport.xyz/rig/${rigAddress}`}
          />

          {/* Recent Donations */}
          <div className="mt-6 mb-6">
            <h2 className="text-[18px] font-semibold mb-3">Recent Funding</h2>
            <div>
              {recentDonations.map((donation) => (
                <DonationHistoryItem
                  key={donation.id}
                  donation={donation}
                  timeAgo={timeAgo}
                  tokenSymbol={tokenSymbol}
                />
              ))}
            </div>
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
              disabled={isFunding || parsedAmount <= 0 || parsedAmount > userBalance}
              className={`
                w-32 h-10 text-[14px] font-semibold rounded-xl transition-all
                ${isFunding
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : parsedAmount > 0 && parsedAmount <= userBalance
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                }
              `}
            >
              {isFunding ? "Funding..." : "Fund"}
            </button>
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
