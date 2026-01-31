"use client";

import { useState } from "react";
import { Upload, ChevronDown, ChevronUp, ChevronLeft, Pickaxe, Dices, Heart, Plus, Minus } from "lucide-react";
import { useFarcaster } from "@/hooks/useFarcaster";

// DONUT token icon - pink circle with black center (donut shape)
function DonutIcon({ size = 20 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="rounded-full bg-black"
        style={{ width: size * 0.4, height: size * 0.4 }}
      />
    </div>
  );
}
import { NavBar } from "@/components/nav-bar";

// Rig types
type RigType = "mine" | "spin" | "fund" | null;

// Bounds matching smart contract validation (for UI enforcement)
const BOUNDS = {
  // Shared: Dutch auction parameters (MineRig, SpinRig, Auction)
  epochPeriod: { min: 600, max: 31536000 }, // 10 min - 365 days (in seconds)
  priceMultiplier: { min: 1.1, max: 3 }, // 1.1x - 3x
  minInitPrice: { min: 0.000001, max: 1e12 }, // Contract uses 1e6 wei min

  // MineRig/SpinRig: Emission (per second)
  initialUps: { min: 0.000001, max: 1000000 }, // Contract max is 1e24 wei/sec
  tailUps: { min: 0.000001 }, // Must be > 0 and <= initialUps

  // MineRig: Supply-based halving
  halvingAmount: { min: 1000 }, // Contract min is 1000 ether (1000 tokens)

  // SpinRig/FundRig: Time-based halving
  halvingPeriod: { min: 604800, max: 31536000 }, // 7 days - 365 days (in seconds)

  // FundRig: Daily emission
  initialEmission: { min: 1, max: 1e12 }, // Contract: 1e18 - 1e30 wei/day (1 - 1e12 tokens/day)
  minEmission: { min: 1 }, // Must be > 0 and <= initialEmission

};

// Default values per rig type (all based on 21M total supply)
const DEFAULTS = {
  mine: {
    donutAmount: 1000,
    unitAmount: 1000000,
    initialUps: 10, // 10 tokens/sec
    tailUps: 0.1, // 0.1 token/sec floor
    halvingAmount: 1000000, // 1M tokens (supply-based)
    rigEpochPeriod: 3600, // 1 hour
    rigPriceMultiplier: 2, // 2x
    rigMinInitPrice: 1, // $1
    upsMultipliers: [] as number[], // empty = no multipliers
    upsMultiplierDuration: 86400, // 24h
  },
  spin: {
    donutAmount: 1000,
    unitAmount: 1000000,
    initialUps: 10, // 10 tokens/sec
    tailUps: 0.1, // 0.1 token/sec floor
    halvingPeriod: 30 * 24 * 3600, // 30 days (time-based)
    rigEpochPeriod: 3600, // 1 hour
    rigPriceMultiplier: 2, // 2x
    rigMinInitPrice: 1, // $1
    odds: [10] as number[], // 0.1% single entry
  },
  fund: {
    donutAmount: 1000,
    unitAmount: 1000000,
    initialUps: 50000, // 50,000 tokens/day (expressed as daily)
    tailUps: 5000, // 5,000 tokens/day floor
    halvingPeriod: 30 * 24 * 3600, // 30 days
  },
};

// Rig type info
const RIG_INFO = {
  mine: {
    icon: Pickaxe,
    name: "Mine",
    description: "Compete for seats. Get paid when someone takes your spot.",
    color: "text-yellow-500",
  },
  spin: {
    icon: Dices,
    name: "Spin",
    description: "Spin for a chance to win tokens from the prize pool.",
    color: "text-purple-500",
  },
  fund: {
    icon: Heart,
    name: "Fund",
    description: "Fund daily to earn tokens. 50% goes to the cause.",
    color: "text-pink-500",
  },
};

// Rig type selection card
function RigTypeCard({
  type,
  onSelect,
}: {
  type: "mine" | "spin" | "fund";
  onSelect: () => void;
}) {
  const info = RIG_INFO[type];
  const Icon = info.icon;

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 rounded-xl ring-1 ring-zinc-700 hover:ring-zinc-500 transition-colors text-left flex items-start gap-4"
    >
      <div className={`${info.color} mt-0.5`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white">{info.name}</div>
        <div className="text-sm text-zinc-400 mt-0.5">{info.description}</div>
      </div>
    </button>
  );
}

// Emission preview component - unified format showing time + supply for all rig types
function EmissionPreview({
  rigType,
  initialUps,
  tailUps,
  halvingPeriod,
  halvingAmount,
}: {
  rigType: "mine" | "spin" | "fund";
  initialUps: number;
  tailUps: number;
  halvingPeriod: number;
  halvingAmount: number;
}) {
  const formatSupply = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    if (n >= 1) return n.toFixed(0);
    return n.toFixed(2);
  };

  const formatTime = (days: number) => {
    if (days >= 365) {
      const years = days / 365;
      return years >= 10 ? `${Math.round(years)}y` : `${years.toFixed(1)}y`;
    }
    return `${Math.round(days)}d`;
  };

  // Calculate milestones based on rig type
  let firstHalvingDays: number;
  let firstHalvingSupply: number;
  let halfwayDays: number;
  let halfwaySupply: number;
  let floorDays: number;
  let floorSupply: number;
  let afterFloorPerYear: number;
  let totalHalvings: number;

  if (rigType === "mine") {
    // Supply-based halving - we know supply, estimate time
    const avgUps = (initialUps + tailUps) / 2; // rough average for time estimation

    // Calculate halvings to reach tail
    totalHalvings = 0;
    let currentUps = initialUps;
    while (currentUps > tailUps && totalHalvings < 64) {
      totalHalvings++;
      currentUps = initialUps / Math.pow(2, totalHalvings);
    }

    // Supply thresholds (geometric series)
    firstHalvingSupply = halvingAmount;

    // 50% to floor supply
    const halfHalvings = Math.floor(totalHalvings / 2);
    halfwaySupply = halvingAmount;
    for (let i = 1; i < halfHalvings; i++) {
      halfwaySupply += halvingAmount / Math.pow(2, i);
    }

    // Floor supply (sum of geometric series)
    floorSupply = halvingAmount;
    for (let i = 1; i < totalHalvings; i++) {
      floorSupply += halvingAmount / Math.pow(2, i);
    }

    // Estimate time based on emission rates (assuming continuous mining)
    // Time = supply / avgEmissionRate
    firstHalvingDays = firstHalvingSupply / (initialUps * 86400);

    // For halfway and floor, use weighted average of rates
    let timeAccum = 0;
    let supplyAccum = 0;
    let foundHalfway = false;
    halfwayDays = 0;
    for (let i = 0; i < totalHalvings; i++) {
      const periodSupply = halvingAmount / Math.pow(2, i);
      const periodUps = initialUps / Math.pow(2, i);
      const periodDays = periodSupply / (periodUps * 86400);
      timeAccum += periodDays;
      supplyAccum += periodSupply;
      if (supplyAccum >= halfwaySupply && !foundHalfway) {
        halfwayDays = timeAccum;
        foundHalfway = true;
      }
    }
    if (!foundHalfway) {
      halfwayDays = timeAccum / 2;
    }
    floorDays = timeAccum;

    // After floor: tailUps per second forever
    afterFloorPerYear = tailUps * 86400 * 365;

  } else {
    // Time-based halving (SpinRig, FundRig) - we know time, calculate supply
    const isDaily = rigType === "fund";
    const initialPerSec = isDaily ? initialUps / 86400 : initialUps;
    const tailPerSec = isDaily ? tailUps / 86400 : tailUps;

    // Calculate halvings to reach tail
    totalHalvings = 0;
    let currentRate = initialPerSec;
    while (currentRate > tailPerSec && totalHalvings < 64) {
      totalHalvings++;
      currentRate = initialPerSec / Math.pow(2, totalHalvings);
    }

    const halvingPeriodDays = halvingPeriod / 86400;

    // First halving
    firstHalvingDays = halvingPeriodDays;
    firstHalvingSupply = initialPerSec * halvingPeriod;

    // 50% to floor (halfway through halvings)
    const halfHalvings = Math.floor(totalHalvings / 2);
    halfwayDays = halfHalvings * halvingPeriodDays;
    halfwaySupply = 0;
    for (let i = 0; i < halfHalvings; i++) {
      halfwaySupply += (initialPerSec / Math.pow(2, i)) * halvingPeriod;
    }

    // Floor reached
    floorDays = totalHalvings * halvingPeriodDays;
    floorSupply = 0;
    for (let i = 0; i < totalHalvings; i++) {
      floorSupply += (initialPerSec / Math.pow(2, i)) * halvingPeriod;
    }

    // After floor
    afterFloorPerYear = tailPerSec * 86400 * 365;
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
      <div className="text-[13px] font-medium text-zinc-300">Emission Schedule</div>
      <div className="space-y-1.5 text-[12px]">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">First halving</span>
          <span className="text-zinc-300 font-medium tabular-nums">
            {formatTime(firstHalvingDays)} · {formatSupply(firstHalvingSupply)} tokens
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">50% to floor</span>
          <span className="text-zinc-300 font-medium tabular-nums">
            {formatTime(halfwayDays)} · {formatSupply(halfwaySupply)} tokens
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Floor reached</span>
          <span className="text-zinc-300 font-medium tabular-nums">
            {formatTime(floorDays)} · {formatSupply(floorSupply)} tokens
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">After floor</span>
          <span className="text-zinc-300 font-medium tabular-nums">
            +{formatSupply(afterFloorPerYear)}/year forever
          </span>
        </div>
      </div>
      <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-700/50">
        {totalHalvings} halvings{rigType === "mine" ? " · Time estimates assume continuous mining" : ""}
      </div>
    </div>
  );
}

// Simple mode summary component
function SimpleModeSummary({ rigType }: { rigType: "mine" | "spin" | "fund" }) {
  const summaries = {
    mine: [
      "21M total supply",
      "1,000 DONUT liquidity",
      "Halving every 1M tokens mined",
      "1 hour epochs, 2x price multiplier",
    ],
    spin: [
      "21M total supply",
      "1,000 DONUT liquidity",
      "Halving every 30 days",
      "95% of spins go to prize pool",
    ],
    fund: [
      "21M total supply",
      "1,000 DONUT liquidity",
      "Configurable halving period (7-365 days)",
      "50% of funds go to recipient",
    ],
  };

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
      {summaries[rigType].map((item, i) => (
        <div key={i} className="text-[13px] text-zinc-400 flex items-center gap-2">
          <span className="text-zinc-500">•</span>
          {item}
        </div>
      ))}
    </div>
  );
}

// Slider component
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue,
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  description?: string;
}) {
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <span className="text-[13px] font-medium tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-white"
      />
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

export default function LaunchPage() {
  const { address: account, isConnected, isInFrame, isConnecting, connect } = useFarcaster();

  // Rig type selection
  const [rigType, setRigType] = useState<RigType>(null);

  // Basic info
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [miningMessage, setMiningMessage] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // FundRig-specific fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Liquidity
  const [donutAmount, setDonutAmount] = useState(DEFAULTS.mine.donutAmount);
  const [unitAmount, setUnitAmount] = useState(DEFAULTS.mine.unitAmount);

  // Emission
  const [initialUps, setInitialUps] = useState(DEFAULTS.mine.initialUps);
  const [tailUps, setTailUps] = useState(DEFAULTS.mine.tailUps);
  const [halvingAmount, setHalvingAmount] = useState(DEFAULTS.mine.halvingAmount);
  const [halvingPeriod, setHalvingPeriod] = useState(DEFAULTS.spin.halvingPeriod);

  // Mining/Spin specific
  const [rigEpochPeriod, setRigEpochPeriod] = useState(DEFAULTS.mine.rigEpochPeriod);
  const [rigPriceMultiplier, setRigPriceMultiplier] = useState(DEFAULTS.mine.rigPriceMultiplier);
  const [rigMinInitPrice, setRigMinInitPrice] = useState(DEFAULTS.mine.rigMinInitPrice);

  // Spin odds (basis points)
  const [odds, setOdds] = useState<number[]>(DEFAULTS.spin.odds);

  // Mine multipliers
  const [upsMultipliers, setUpsMultipliers] = useState<number[]>(DEFAULTS.mine.upsMultipliers);
  const [upsMultiplierDuration, setUpsMultiplierDuration] = useState(DEFAULTS.mine.upsMultiplierDuration);


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRigTypeSelect = (type: "mine" | "spin" | "fund") => {
    setRigType(type);
    // Reset to defaults for selected rig type
    if (type === "mine") {
      const defaults = DEFAULTS.mine;
      setDonutAmount(defaults.donutAmount);
      setUnitAmount(defaults.unitAmount);
      setInitialUps(defaults.initialUps);
      setTailUps(defaults.tailUps);
      setHalvingAmount(defaults.halvingAmount);
      setRigEpochPeriod(defaults.rigEpochPeriod);
      setRigPriceMultiplier(defaults.rigPriceMultiplier);
      setRigMinInitPrice(defaults.rigMinInitPrice);
      setUpsMultipliers([...defaults.upsMultipliers]);
      setUpsMultiplierDuration(defaults.upsMultiplierDuration);
    } else if (type === "spin") {
      const defaults = DEFAULTS.spin;
      setDonutAmount(defaults.donutAmount);
      setUnitAmount(defaults.unitAmount);
      setInitialUps(defaults.initialUps);
      setTailUps(defaults.tailUps);
      setHalvingPeriod(defaults.halvingPeriod);
      setRigEpochPeriod(defaults.rigEpochPeriod);
      setRigPriceMultiplier(defaults.rigPriceMultiplier);
      setRigMinInitPrice(defaults.rigMinInitPrice);
      setOdds([...defaults.odds]);
    } else if (type === "fund") {
      const defaults = DEFAULTS.fund;
      setDonutAmount(defaults.donutAmount);
      setUnitAmount(defaults.unitAmount);
      setInitialUps(defaults.initialUps);
      setTailUps(defaults.tailUps);
      setHalvingPeriod(defaults.halvingPeriod);
    }
  };

  const handleBack = () => {
    setRigType(null);
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Form validation
  const isFormValid = (() => {
    if (!tokenName.length || !tokenSymbol.length) return false;
    if (rigType === "fund") {
      if (!recipientName.length) return false;
      if (!isValidAddress(recipientAddress)) return false;
    }
    return true;
  })();

  // Format helpers
  const formatDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatMultiplier = (n: number) => `${n.toFixed(1)}x`;

  const formatPrice = (n: number) => `$${n.toFixed(2)}`;

  const formatRate = (n: number) => `${n}/s`;

  const formatDailyRate = (n: number) => `${formatNumber(n)}/day`;

  // Get action label based on rig type
  const getActionLabel = () => {
    switch (rigType) {
      case "mine":
        return "Mining message (optional)";
      case "spin":
        return "Spin message (optional)";
      case "fund":
        return "Funding message (optional)";
      default:
        return "Message (optional)";
    }
  };

  return (
    <main className="flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)",
        }}
      >
        {/* Header */}
        <div className="px-4 pb-4">
          {rigType === null ? (
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Launch</h1>
              {isConnected && account ? (
                <div className="px-3 py-1.5 rounded-full bg-secondary text-[13px] text-muted-foreground font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              ) : (
                !isInFrame && (
                  <button
                    onClick={() => connect()}
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-1 -ml-1 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">
                Launch a {RIG_INFO[rigType].name} Rig
              </h1>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-2">
          {rigType === null ? (
            // Rig Type Selection
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm mb-6">What type of rig?</p>
              <RigTypeCard type="mine" onSelect={() => handleRigTypeSelect("mine")} />
              <RigTypeCard type="spin" onSelect={() => handleRigTypeSelect("spin")} />
              <RigTypeCard type="fund" onSelect={() => handleRigTypeSelect("fund")} />
            </div>
          ) : (
            // Token Details Form
            <div className="space-y-4">
              {/* Logo + Name + Symbol Row */}
              <div className="flex items-start gap-4">
                {/* Logo Upload */}
                <label className="cursor-pointer flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="w-[88px] h-[88px] rounded-xl ring-1 ring-zinc-700 flex items-center justify-center overflow-hidden hover:ring-zinc-500 transition-colors">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Token logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-zinc-500" />
                    )}
                  </div>
                </label>

                {/* Name + Symbol */}
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    placeholder="Token name"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-transparent ring-1 ring-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-500"
                  />
                  <input
                    type="text"
                    placeholder="SYMBOL"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full h-10 px-3 rounded-lg bg-transparent ring-1 ring-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-500"
                  />
                </div>
              </div>

              {/* Description */}
              <textarea
                placeholder="Description (optional)"
                value={tokenDescription}
                onChange={(e) => setTokenDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-transparent ring-1 ring-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-500 resize-none text-sm"
              />

              {/* Action Message */}
              <input
                type="text"
                placeholder={getActionLabel()}
                value={miningMessage}
                onChange={(e) => setMiningMessage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-transparent ring-1 ring-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-500 text-sm"
              />

              {/* FundRig-specific fields */}
              {rigType === "fund" && (
                <div className="space-y-2 pt-2">
                  <div className="text-[13px] text-zinc-400 mb-2">Recipient (required)</div>
                  <input
                    type="text"
                    placeholder="Recipient name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-transparent ring-1 ring-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-500 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className={`w-full h-10 px-3 rounded-lg bg-transparent ring-1 text-white placeholder:text-zinc-500 focus:outline-none text-sm font-mono ${
                      recipientAddress.length > 0 && !isValidAddress(recipientAddress)
                        ? "ring-red-500/50 focus:ring-red-500"
                        : "ring-zinc-700 focus:ring-zinc-500"
                    }`}
                  />
                  {recipientAddress.length > 0 && !isValidAddress(recipientAddress) && (
                    <p className="text-[11px] text-red-400">Enter a valid Ethereum address</p>
                  )}
                </div>
              )}

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-3 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                <span>Advanced Settings</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Simple Mode Summary (only when Advanced collapsed) */}
              {!showAdvanced && (
                <>
                  <SimpleModeSummary rigType={rigType} />
                  <EmissionPreview
                    rigType={rigType}
                    initialUps={initialUps}
                    tailUps={tailUps}
                    halvingPeriod={halvingPeriod}
                    halvingAmount={halvingAmount}
                  />
                </>
              )}

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="space-y-6 pb-4">
                  {/* Liquidity Section */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-1">Liquidity</h3>
                    <Slider
                      label="DONUT for LP"
                      value={donutAmount}
                      onChange={setDonutAmount}
                      min={1000}
                      max={100000}
                      step={1000}
                      formatValue={formatNumber}
                      description="DONUT provided for initial liquidity"
                    />
                    <Slider
                      label="Initial Token Supply"
                      value={unitAmount}
                      onChange={setUnitAmount}
                      min={100000}
                      max={100000000}
                      step={100000}
                      formatValue={formatNumber}
                      description="Tokens minted for initial LP"
                    />
                    {/* Initial LP Summary */}
                    {(() => {
                      const donutPriceUsd = 0.001; // TODO: Fetch real DONUT price
                      const initialPriceDonut = donutAmount / unitAmount;
                      const initialPriceUsd = initialPriceDonut * donutPriceUsd;
                      const liquidityUsd = donutAmount * donutPriceUsd * 2; // Both sides of LP
                      const marketCapUsd = unitAmount * initialPriceUsd;

                      const formatUsd = (n: number) => {
                        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
                        if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
                        if (n >= 1) return `$${n.toFixed(2)}`;
                        if (n >= 0.01) return `$${n.toFixed(4)}`;
                        return `$${n.toFixed(6)}`;
                      };

                      return (
                        <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-zinc-500">Initial Price</span>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <DonutIcon size={12} />
                                <span className="text-[12px] font-medium tabular-nums">
                                  {initialPriceDonut.toFixed(6)}
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500">{formatUsd(initialPriceUsd)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-zinc-500">Initial Liquidity</span>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <DonutIcon size={12} />
                                <span className="text-[12px] font-medium tabular-nums">
                                  {formatNumber(donutAmount)} + {formatNumber(unitAmount)} tokens
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500">{formatUsd(liquidityUsd)} TVL</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-zinc-500">Initial Market Cap</span>
                            <span className="text-[12px] font-medium tabular-nums">{formatUsd(marketCapUsd)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Emission Section */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground mb-1">Emission</h3>
                    {rigType === "fund" ? (
                      // FundRig: daily rates
                      <>
                        <Slider
                          label="Starting Emission"
                          value={initialUps}
                          onChange={(v) => {
                            setInitialUps(v);
                            if (tailUps > v) setTailUps(v);
                          }}
                          min={1000}
                          max={500000}
                          step={1000}
                          formatValue={formatDailyRate}
                          description="Tokens distributed per day at launch"
                        />
                        <Slider
                          label="Floor Emission"
                          value={tailUps}
                          onChange={setTailUps}
                          min={100}
                          max={initialUps}
                          step={100}
                          formatValue={formatDailyRate}
                          description="Minimum daily emission after halvings"
                        />
                      </>
                    ) : (
                      // MineRig/SpinRig: per-second rates
                      <>
                        <Slider
                          label="Starting Emission"
                          value={initialUps}
                          onChange={(v) => {
                            setInitialUps(v);
                            if (tailUps > v) setTailUps(v);
                          }}
                          min={1}
                          max={100}
                          formatValue={formatRate}
                          description="Tokens minted per second at launch"
                        />
                        <Slider
                          label="Floor Emission"
                          value={tailUps}
                          onChange={setTailUps}
                          min={0.01}
                          max={initialUps}
                          step={0.01}
                          formatValue={formatRate}
                          description="Minimum emission rate after halvings"
                        />
                      </>
                    )}

                    {/* Halving - different per rig type */}
                    {rigType === "mine" && (
                      <Slider
                        label="Halving Threshold"
                        value={halvingAmount}
                        onChange={setHalvingAmount}
                        min={BOUNDS.halvingAmount.min}
                        max={100000000}
                        step={1000}
                        formatValue={formatNumber}
                        description="Tokens minted before emission halves (min: 1,000)"
                      />
                    )}
                    {rigType === "spin" && (
                      <Slider
                        label="Halving Period"
                        value={halvingPeriod}
                        onChange={setHalvingPeriod}
                        min={BOUNDS.halvingPeriod.min}
                        max={BOUNDS.halvingPeriod.max}
                        step={86400} // 1 day steps
                        formatValue={formatDuration}
                        description="Time between emission halvings (7d - 365d)"
                      />
                    )}
                    {rigType === "fund" && (
                      <Slider
                        label="Halving Period"
                        value={halvingPeriod}
                        onChange={setHalvingPeriod}
                        min={BOUNDS.halvingPeriod.min}
                        max={BOUNDS.halvingPeriod.max}
                        step={86400} // 1 day steps
                        formatValue={formatDuration}
                        description="Days between emission halvings (7d - 365d)"
                      />
                    )}

                    {/* Emission Preview */}
                    <EmissionPreview
                      rigType={rigType}
                      initialUps={initialUps}
                      tailUps={tailUps}
                      halvingPeriod={halvingPeriod}
                      halvingAmount={halvingAmount}
                    />
                  </div>

                  {/* Mining/Spin specific settings */}
                  {(rigType === "mine" || rigType === "spin") && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground mb-1">
                        {rigType === "mine" ? "Mining" : "Spinning"}
                      </h3>
                      <Slider
                        label="Epoch Duration"
                        value={rigEpochPeriod}
                        onChange={setRigEpochPeriod}
                        min={BOUNDS.epochPeriod.min}
                        max={604800} // 7 days max for good UX (contract allows up to 365 days)
                        step={600}
                        formatValue={formatDuration}
                        description="Price resets after each epoch (10m - 7d)"
                      />
                      <Slider
                        label="Price Multiplier"
                        value={rigPriceMultiplier}
                        onChange={setRigPriceMultiplier}
                        min={BOUNDS.priceMultiplier.min}
                        max={BOUNDS.priceMultiplier.max}
                        step={0.1}
                        formatValue={formatMultiplier}
                        description={
                          rigType === "mine"
                            ? "Price multiplier when someone mines (1.1x - 3x)"
                            : "Price multiplier when someone spins (1.1x - 3x)"
                        }
                      />
                      <Slider
                        label="Min Start Price"
                        value={rigMinInitPrice}
                        onChange={setRigMinInitPrice}
                        min={1}
                        max={100}
                        step={0.1}
                        formatValue={formatPrice}
                        description="Minimum price at epoch start"
                      />
                    </div>
                  )}

                  {/* Spin Odds (immutable at launch) */}
                  {rigType === "spin" && (() => {
                    const oddsPresets = [
                      { value: 10, label: "0.1%" },
                      { value: 50, label: "0.5%" },
                      { value: 100, label: "1%" },
                      { value: 200, label: "2%" },
                      { value: 500, label: "5%" },
                      { value: 1000, label: "10%" },
                      { value: 2500, label: "25%" },
                      { value: 5000, label: "50%" },
                    ];
                    const getOddsCount = (value: number) => odds.filter(o => o === value).length;
                    const addOddsValue = (value: number) => {
                      if (odds.length < 20) {
                        setOdds([...odds, value].sort((a, b) => a - b));
                      }
                    };
                    const removeOddsValue = (value: number) => {
                      const idx = odds.indexOf(value);
                      if (idx !== -1 && odds.length > 1) {
                        const next = [...odds];
                        next.splice(idx, 1);
                        setOdds(next);
                      }
                    };
                    return (
                      <div>
                        <h3 className="text-[13px] font-semibold text-foreground mb-1">Spin Odds</h3>
                        <p className="text-muted-foreground text-[11px] mb-3">
                          Payout pool ({odds.length}/20). One is randomly selected per spin. Set at launch and cannot be changed.
                        </p>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {oddsPresets.map((preset) => {
                            const count = getOddsCount(preset.value);
                            const canAdd = odds.length < 20;
                            const canRemove = count > 0 && odds.length > 1;
                            const probability = odds.length > 0
                              ? Math.round((count / odds.length) * 100)
                              : 0;
                            return (
                              <div key={preset.value} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-zinc-800/30">
                                <div className="text-[13px] font-semibold">{preset.label}</div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => removeOddsValue(preset.value)}
                                    disabled={!canRemove}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                      canRemove
                                        ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    }`}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <div className="w-6 text-center text-[13px] font-bold tabular-nums">
                                    {count}
                                  </div>
                                  <button
                                    onClick={() => addOddsValue(preset.value)}
                                    disabled={!canAdd}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                      canAdd
                                        ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    }`}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-[10px] text-muted-foreground tabular-nums">
                                  {probability}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Visual summary */}
                        <div className="p-3 rounded-xl bg-zinc-800/50">
                          <div className="text-[11px] text-muted-foreground mb-1">Current pool:</div>
                          <div className="flex flex-wrap gap-1">
                            {odds.map((o, i) => {
                              const preset = oddsPresets.find(p => p.value === o);
                              return (
                                <span key={i} className="px-2 py-0.5 rounded bg-zinc-700 text-[12px] font-medium">
                                  {preset ? preset.label : `${(o / 100).toFixed(1)}%`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mine Multipliers (optional, immutable at launch) */}
                  {rigType === "mine" && (() => {
                    const multiplierPresets = [1, 2, 3, 5, 10];
                    const getMultiplierCount = (value: number) => upsMultipliers.filter(m => m === value).length;
                    const addMultiplierValue = (value: number) => {
                      if (upsMultipliers.length < 20) {
                        setUpsMultipliers([...upsMultipliers, value].sort((a, b) => a - b));
                      }
                    };
                    const removeMultiplierValue = (value: number) => {
                      const idx = upsMultipliers.indexOf(value);
                      if (idx !== -1 && upsMultipliers.length > 0) {
                        const next = [...upsMultipliers];
                        next.splice(idx, 1);
                        setUpsMultipliers(next);
                      }
                    };
                    const durationOptions = [
                      { value: 3600, label: "1h" },
                      { value: 14400, label: "4h" },
                      { value: 43200, label: "12h" },
                      { value: 86400, label: "24h" },
                      { value: 172800, label: "2d" },
                      { value: 604800, label: "7d" },
                    ];
                    return (
                      <div>
                        <h3 className="text-[13px] font-semibold text-foreground mb-1">Multipliers (Optional)</h3>
                        <p className="text-muted-foreground text-[11px] mb-3">
                          Leave empty for no multipliers (1x default). Set at launch and cannot be changed.
                        </p>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {multiplierPresets.map((mult) => {
                            const count = getMultiplierCount(mult);
                            const canAdd = upsMultipliers.length < 20;
                            const canRemove = count > 0;
                            const probability = upsMultipliers.length > 0
                              ? Math.round((count / upsMultipliers.length) * 100)
                              : 0;
                            return (
                              <div key={mult} className="flex flex-col items-center gap-1">
                                <div className="text-[14px] font-semibold">{mult}x</div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => removeMultiplierValue(mult)}
                                    disabled={!canRemove}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                      canRemove
                                        ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    }`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-8 text-center text-[14px] font-bold tabular-nums">
                                    {count}
                                  </div>
                                  <button
                                    onClick={() => addMultiplierValue(mult)}
                                    disabled={!canAdd}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                      canAdd
                                        ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="text-[11px] text-muted-foreground tabular-nums">
                                  {probability}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Visual summary */}
                        {upsMultipliers.length > 0 && (
                          <div className="p-3 rounded-xl bg-zinc-800/50 mb-3">
                            <div className="text-[11px] text-muted-foreground mb-1">Current pool:</div>
                            <div className="flex flex-wrap gap-1">
                              {upsMultipliers.map((mult, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-zinc-700 text-[12px] font-medium">
                                  {mult}x
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Duration picker (only relevant if multipliers are set) */}
                        {upsMultipliers.length > 0 && (
                          <div>
                            <label className="text-muted-foreground text-[12px] mb-2 block">
                              Multiplier Duration
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {durationOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => setUpsMultiplierDuration(opt.value)}
                                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                                    upsMultiplierDuration === opt.value
                                      ? "bg-white text-black"
                                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Bar (only show when rig type selected) */}
        {rigType !== null && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-800 flex justify-center"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}
          >
            <div className="flex items-center justify-between w-full max-w-[520px] px-4 py-3 bg-background">
              <div className="flex items-center gap-5">
                <div>
                  <div className="text-muted-foreground text-[11px]">Amount</div>
                  <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1">
                    <DonutIcon size={16} />
                    {formatNumber(donutAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Balance</div>
                  <div className="font-semibold text-[15px] tabular-nums flex items-center gap-1">
                    <DonutIcon size={16} />
                    {formatNumber(10000)} {/* TODO: Replace with actual user balance */}
                  </div>
                </div>
              </div>
              <button
                disabled={!isFormValid}
                className={`w-32 h-10 text-[14px] font-semibold rounded-xl transition-all ${
                  isFormValid
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                Launch
              </button>
            </div>
          </div>
        )}
      </div>
      <NavBar />
    </main>
  );
}
