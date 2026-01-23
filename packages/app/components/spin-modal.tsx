"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavBar } from "@/components/nav-bar";
import { Leaderboard } from "@/components/leaderboard";
import { SpinHistoryItem } from "@/components/spin-history-item";

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
  const [prizePool, setPrizePool] = useState(124532.45);
  const [lastWinner, setLastWinner] = useState({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    name: "DiamondHands",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=winner",
    payoutPercent: 12,
    won: 14943,
  });

  const odds = [
    { chance: 50, payout: 1 },
    { chance: 25, payout: 5 },
    { chance: 15, payout: 15 },
    { chance: 8, payout: 35 },
    { chance: 2, payout: 100 },
  ];

  const userStats = {
    spent: 564.68,
    won: 45230,
    wonUsd: 123.45,
    spins: 47,
    net: -441.23,
  };

  const rigUrl = typeof window !== "undefined" ? `${window.location.origin}/rig/${rigAddress}` : "";

  const mockLeaderboard = [
    { rank: 1, address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", mined: BigInt(892000n * 10n**18n), minedFormatted: "892K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
    { rank: 2, address: "0x1234567890abcdef1234567890abcdef12345678", mined: BigInt(654000n * 10n**18n), minedFormatted: "654K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
    { rank: 3, address: "0xabcdef1234567890abcdef1234567890abcdef12", mined: BigInt(421000n * 10n**18n), minedFormatted: "421K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
    { rank: 4, address: "0x9876543210fedcba9876543210fedcba98765432", mined: BigInt(287000n * 10n**18n), minedFormatted: "287K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: false, isFriend: false, profile: null },
    { rank: 5, address: "0xcafebabecafebabecafebabecafebabecafebabe", mined: BigInt(156000n * 10n**18n), minedFormatted: "156K", spent: BigInt(0), spentFormatted: "0", earned: BigInt(0), earnedFormatted: "0", isCurrentUser: true, isFriend: false, profile: null },
  ];

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

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4">
          {/* Prize Pool Hero */}
          <div className="text-center py-4">
            <div className="text-[12px] text-muted-foreground mb-1">PRIZE POOL</div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
                {tokenSymbol.charAt(0)}
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {prizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[13px] text-muted-foreground">
              ${(prizePool * 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Last Winner / Spinning State */}
          <div className="py-4 mb-2">
            {isSpinning ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={lastWinner.avatar} alt={lastWinner.name} />
                  <AvatarFallback className="bg-zinc-700 text-sm">
                    {lastWinner.address.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium">{lastWinner.name}</div>
                  <div className="text-[13px] text-muted-foreground">
                    Won {lastWinner.payoutPercent}% → {lastWinner.won.toLocaleString()} {tokenSymbol}
                  </div>
                </div>
                <div className="text-[12px] text-muted-foreground">Last spin</div>
              </div>
            )}
          </div>

          {/* Current Price */}
          <div className="text-center mb-6">
            <span className="text-[13px] text-muted-foreground">Current price: </span>
            <span className="text-[13px] font-medium">${currentPrice.toFixed(4)}</span>
          </div>

          {/* Odds */}
          <div className="mb-6">
            <div className="font-semibold text-[18px] mb-3">Odds</div>
            {/* Header */}
            <div className="grid grid-cols-3 py-2 text-[12px] text-muted-foreground border-b border-zinc-800">
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
                  className={`grid grid-cols-3 py-3 text-[14px] ${
                    isJackpot ? "bg-zinc-800/30 -mx-4 px-4" : ""
                  } ${i < odds.length - 1 ? "border-b border-zinc-800/50" : ""}`}
                >
                  <div className="font-medium">{odd.chance}%</div>
                  <div className="text-muted-foreground">{odd.payout}%</div>
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
                <div className="text-[12px] text-muted-foreground">${userStats.wonUsd.toFixed(2)}</div>
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
                  userStats.net >= 0 ? "text-white" : "text-muted-foreground"
                }`}>
                  {userStats.net >= 0 ? "+" : ""}${userStats.net.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <Leaderboard
            entries={mockLeaderboard}
            userRank={5}
            tokenSymbol={tokenSymbol}
            tokenName={tokenName}
            rigUrl={rigUrl}
            isLoading={false}
          />

          {/* Recent Spins */}
          <div className="mt-6 mb-6">
            <div className="font-semibold text-[18px] mb-3">Recent Spins</div>
            <div>
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
