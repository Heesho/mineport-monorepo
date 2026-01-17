"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { NavBar } from "@/components/nav-bar";

type AuctionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol?: string;
  tokenName?: string;
  // Auction state
  lpBalance?: number; // User's LP balance
  lpPrice?: number; // Current auction price for LP (in USD)
  usdcReward?: number; // USDC reward amount
};

export function AuctionModal({
  isOpen,
  onClose,
  tokenSymbol = "DONUT",
  tokenName = "Donut",
  lpBalance = 843.655,
  lpPrice = 0.00007, // Price per LP token
  usdcReward = 2.67,
}: AuctionModalProps) {
  // Simulate price decay
  const [currentLpPrice, setCurrentLpPrice] = useState(lpPrice);

  useEffect(() => {
    if (!isOpen) {
      setCurrentLpPrice(lpPrice);
      return;
    }

    // Simulate slow decay
    const interval = setInterval(() => {
      setCurrentLpPrice((prev) => Math.max(prev * 0.9999, lpPrice * 0.5));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, lpPrice]);

  const currentLpValueUsd = lpBalance * currentLpPrice;
  const profitUsd = usdcReward - currentLpValueUsd;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen justify-center bg-zinc-900">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
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
          <span className="text-base font-semibold">Auction</span>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-4">
          {/* Title */}
          <div className="mt-4 mb-6">
            <h1 className="text-2xl font-bold">Buy USDC</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {lpBalance.toFixed(3)} {tokenSymbol}-DONUT LP available
            </p>
          </div>

          {/* You Pay */}
          <div className="py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">You pay</span>
              <span className="text-lg font-semibold tabular-nums">
                {lpBalance.toFixed(3)} LP
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-zinc-500">{tokenSymbol}-DONUT LP</span>
              <span className="text-xs text-zinc-500 tabular-nums">
                ~${currentLpValueUsd.toFixed(2)}
              </span>
            </div>
          </div>

          {/* You Receive */}
          <div className="py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">You receive</span>
              <span className="text-lg font-semibold tabular-nums">
                ${usdcReward.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-zinc-500">USDC</span>
              <span className="text-xs text-zinc-500"></span>
            </div>
          </div>

          {/* Profit indicator */}
          <div className="flex items-center justify-end gap-3 py-3 text-xs text-zinc-500">
            <span className="tabular-nums">
              {profitUsd >= 0 ? "+" : ""}{profitUsd.toFixed(2)} {profitUsd >= 0 ? "profit" : "loss"}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Info text */}
          <p className="text-xs text-zinc-500 text-center mb-4">
            Auction price decays over time. Buy when profitable.
          </p>

          {/* Action button */}
          <div
            className="pb-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}
          >
            <button
              disabled={lpBalance === 0}
              className={`w-full h-12 rounded-full font-semibold text-base transition-all ${
                lpBalance > 0
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              Sell LP
            </button>
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
