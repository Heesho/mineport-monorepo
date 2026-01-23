"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
