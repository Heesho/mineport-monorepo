"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Clock, Share2, BarChart3 } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";

// Mock token data
const MOCK_TOKEN = {
  name: "Donut",
  symbol: "DONUT",
  price: 0.00234,
  change24h: 12.5,
  marketCap: 234000,
  volume24h: 45000,
  holders: 1234,
  description: "The original donut token. Mine it, earn it, love it.",
  color: "from-amber-500 to-orange-600",
};

// Mock price history for chart
const MOCK_CHART_DATA = [
  { time: "9:00", price: 0.0021 },
  { time: "10:00", price: 0.00215 },
  { time: "11:00", price: 0.00208 },
  { time: "12:00", price: 0.00225 },
  { time: "13:00", price: 0.00218 },
  { time: "14:00", price: 0.0023 },
  { time: "15:00", price: 0.00228 },
  { time: "16:00", price: 0.00234 },
];

// Mock miner info
const MOCK_MINER = {
  address: "0x1234...5678",
  name: "whale.eth",
  avatar: null,
  miningFor: "2h 34m",
  earned: 1500,
};

type TabOption = "mine" | "trade";
type Timeframe = "1H" | "1D" | "1W" | "1M" | "ALL";

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function formatMarketCap(mcap: number): string {
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(2)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(1)}K`;
  return `$${mcap.toFixed(0)}`;
}

function TokenLogo({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold bg-gradient-to-br ${color} text-white shadow-lg`}
    >
      {name.charAt(0)}
    </div>
  );
}

// Simple chart component
function SimpleChart({
  data,
  isPositive,
}: {
  data: typeof MOCK_CHART_DATA;
  isPositive: boolean;
}) {
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.price - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  // Create gradient fill path
  const fillPoints = `0,100 ${points} 100,100`;

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isPositive ? "hsl(0, 0%, 70%)" : "hsl(0, 0%, 45%)"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "hsl(0, 0%, 70%)" : "hsl(0, 0%, 45%)"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <polygon fill="url(#chartGradient)" points={fillPoints} />
      <polyline
        fill="none"
        stroke={isPositive ? "hsl(0, 0%, 70%)" : "hsl(0, 0%, 45%)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function RigDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<TabOption>("mine");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [mineAmount, setMineAmount] = useState("");

  const isPositive = MOCK_TOKEN.change24h >= 0;

  return (
    <main className="flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <Link
            href="/explore"
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <TokenLogo name={MOCK_TOKEN.name} color={MOCK_TOKEN.color} size="sm" />
            <span className="font-semibold text-[15px]">{MOCK_TOKEN.symbol}</span>
          </div>
          <button className="p-2 -mr-2 rounded-xl hover:bg-secondary transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
          {/* Price Section */}
          <div className="py-3">
            <div className="price-large">{formatPrice(MOCK_TOKEN.price)}</div>
            <div
              className={`text-[13px] font-medium mt-0.5 ${
                isPositive ? "text-primary" : "text-destructive"
              }`}
            >
              {isPositive ? "+" : ""}
              {MOCK_TOKEN.change24h.toFixed(2)}% today
            </div>
          </div>

          {/* Chart */}
          <div className="h-44 mb-2">
            <SimpleChart data={MOCK_CHART_DATA} isPositive={isPositive} />
          </div>

          {/* Timeframe Selector */}
          <div className="flex justify-between mb-5 px-2">
            {(["1H", "1D", "1W", "1M", "ALL"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  timeframe === tf
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="card-elevated p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-[12px] mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Market Cap
              </div>
              <div className="font-semibold text-[15px] tabular-nums">
                {formatMarketCap(MOCK_TOKEN.marketCap)}
              </div>
            </div>
            <div className="card-elevated p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-[12px] mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                24h Volume
              </div>
              <div className="font-semibold text-[15px] tabular-nums">
                {formatMarketCap(MOCK_TOKEN.volume24h)}
              </div>
            </div>
            <div className="card-elevated p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-[12px] mb-1">
                <Users className="w-3.5 h-3.5" />
                Holders
              </div>
              <div className="font-semibold text-[15px] tabular-nums">
                {MOCK_TOKEN.holders.toLocaleString()}
              </div>
            </div>
            <div className="card-elevated p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground text-[12px] mb-1">
                <Clock className="w-3.5 h-3.5" />
                Current Miner
              </div>
              <div className="font-semibold text-[15px]">{MOCK_MINER.name}</div>
            </div>
          </div>

          {/* About Section */}
          <div className="card-elevated p-4 mb-5">
            <div className="font-semibold text-[15px] mb-2">About</div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {MOCK_TOKEN.description}
            </p>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="px-4 py-3 bg-background border-t border-border">
          {/* Tabs */}
          <div className="flex bg-secondary rounded-xl p-1 mb-3">
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === "mine"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setActiveTab("trade")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === "trade"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Trade
            </button>
          </div>

          {activeTab === "mine" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Mining Price</span>
                <span className="font-medium tabular-nums">$0.50</span>
              </div>
              <Button className="w-full h-11 text-[15px] font-semibold">
                Start Mining
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={mineAmount}
                  onChange={(e) => setMineAmount(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-[17px] font-medium tabular-nums transition-shadow"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-medium">
                  USDC
                </div>
              </div>
              <Button className="w-full h-11 text-[15px] font-semibold">
                Buy {MOCK_TOKEN.symbol}
              </Button>
            </div>
          )}
        </div>
      </div>
      <NavBar />
    </main>
  );
}
