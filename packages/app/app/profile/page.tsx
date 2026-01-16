"use client";

import { useState } from "react";
import Link from "next/link";
import { User, ChevronRight, TrendingUp, Coins } from "lucide-react";
import { NavBar } from "@/components/nav-bar";

// Mock user data
const MOCK_USER = {
  name: "John Doe",
  username: "@johndoe",
  avatar: null,
  totalValue: 1234.56,
  change24h: 5.4,
  totalGains: 156.78,
};

// Mock portfolio holdings
const MOCK_HOLDINGS = [
  {
    address: "0x1234",
    name: "Donut",
    symbol: "DONUT",
    amount: 15000,
    value: 450.5,
    change24h: 12.5,
    color: "from-amber-500 to-orange-600",
  },
  {
    address: "0x2345",
    name: "Moon Token",
    symbol: "MOON",
    amount: 500,
    value: 320.0,
    change24h: -3.2,
    color: "from-purple-500 to-violet-600",
  },
  {
    address: "0x3456",
    name: "Fire Token",
    symbol: "FIRE",
    amount: 10000,
    value: 245.0,
    change24h: 45.8,
    color: "from-orange-500 to-red-600",
  },
];

// Mock launched tokens
const MOCK_LAUNCHED = [
  {
    address: "0x4567",
    name: "My First Token",
    symbol: "MFT",
    marketCap: 12500,
    holders: 34,
    color: "from-blue-500 to-cyan-500",
  },
];

type TabOption = "holdings" | "launched";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}

function TokenLogo({ name, color }: { name: string; color: string }) {
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-br ${color} text-white shadow-lg`}
    >
      {name.charAt(0)}
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabOption>("holdings");

  return (
    <main className="flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        {/* Header */}
        <div className="px-4 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight mb-5">Profile</h1>

          {/* User Card */}
          <div className="card-elevated p-5 mb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
                {MOCK_USER.avatar ? (
                  <img
                    src={MOCK_USER.avatar}
                    alt={MOCK_USER.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <div className="font-semibold text-[17px]">{MOCK_USER.name}</div>
                <div className="text-[13px] text-muted-foreground">
                  {MOCK_USER.username}
                </div>
              </div>
            </div>

            {/* Portfolio Value */}
            <div className="text-center pb-1">
              <div className="text-[13px] text-muted-foreground mb-1">
                Portfolio Value
              </div>
              <div className="price-large mb-1">
                {formatCurrency(MOCK_USER.totalValue)}
              </div>
              <div
                className={`text-[13px] font-medium ${
                  MOCK_USER.change24h >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {MOCK_USER.change24h >= 0 ? "+" : ""}
                {MOCK_USER.change24h.toFixed(2)}% today
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-[13px] mb-1">
                <TrendingUp className="w-4 h-4" />
                Total Gains
              </div>
              <div className="font-semibold text-primary tabular-nums">
                +{formatCurrency(MOCK_USER.totalGains)}
              </div>
            </div>
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-[13px] mb-1">
                <Coins className="w-4 h-4" />
                Tokens
              </div>
              <div className="font-semibold tabular-nums">
                {MOCK_HOLDINGS.length}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => setActiveTab("holdings")}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === "holdings"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Holdings ({MOCK_HOLDINGS.length})
            </button>
            <button
              onClick={() => setActiveTab("launched")}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === "launched"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Launched ({MOCK_LAUNCHED.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
          {activeTab === "holdings" ? (
            <div className="space-y-0.5">
              {MOCK_HOLDINGS.map((holding) => (
                <Link
                  key={holding.address}
                  href={`/rig/${holding.address}`}
                  className="list-item"
                >
                  <div className="flex items-center gap-3">
                    <TokenLogo name={holding.name} color={holding.color} />
                    <div>
                      <div className="font-medium text-[15px]">{holding.name}</div>
                      <div className="text-[13px] text-muted-foreground">
                        {formatAmount(holding.amount)} {holding.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="price-medium">
                      {formatCurrency(holding.value)}
                    </div>
                    <div
                      className={
                        holding.change24h >= 0
                          ? "change-positive"
                          : "change-negative"
                      }
                    >
                      {holding.change24h >= 0 ? "+" : ""}
                      {holding.change24h.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {MOCK_LAUNCHED.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <Coins className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-[15px] font-medium">No tokens launched yet</p>
                  <p className="text-[13px] mt-1 opacity-70">Create your first token!</p>
                </div>
              ) : (
                MOCK_LAUNCHED.map((token) => (
                  <Link
                    key={token.address}
                    href={`/rig/${token.address}`}
                    className="list-item"
                  >
                    <div className="flex items-center gap-3">
                      <TokenLogo name={token.name} color={token.color} />
                      <div>
                        <div className="font-medium text-[15px]">{token.name}</div>
                        <div className="text-[13px] text-muted-foreground">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-medium text-[15px] tabular-nums">
                          ${(token.marketCap / 1000).toFixed(1)}K
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {token.holders} holders
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <NavBar />
    </main>
  );
}
