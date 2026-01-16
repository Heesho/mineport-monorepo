"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUnits, formatEther } from "viem";
import type { RigListItem } from "@/hooks/useAllRigs";
import { cn } from "@/lib/utils";
import { ipfsToHttp } from "@/lib/constants";
import { QUOTE_TOKEN_DECIMALS } from "@/lib/contracts";

// Format quote token (USDC - 6 decimals)
const formatQuote = (value: bigint, maximumFractionDigits = 2) => {
  if (value === 0n) return "0";
  const asNumber = Number(formatUnits(value, QUOTE_TOKEN_DECIMALS));
  if (!Number.isFinite(asNumber)) {
    return formatUnits(value, QUOTE_TOKEN_DECIMALS);
  }
  return asNumber.toLocaleString(undefined, {
    maximumFractionDigits,
  });
};

type RigCardProps = {
  rig: RigListItem;
  donutUsdPrice?: number;
  isTopBump?: boolean;
  isNewBump?: boolean;
};

const formatUsd = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value < 0.01) return `<$0.01`;
  return `$${value.toFixed(2)}`;
};

export function RigCard({ rig, donutUsdPrice = 0.01, isTopBump = false, isNewBump = false }: RigCardProps) {
  // Calculate market cap: totalMinted * unitPrice (in DONUT) * donutUsdPrice
  const marketCapUsd = rig.unitPrice > 0n
    ? Number(formatEther(rig.totalMinted)) * Number(formatEther(rig.unitPrice)) * donutUsdPrice
    : 0;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fetch metadata to get image URL
  useEffect(() => {
    if (!rig.rigUri) return;

    const metadataUrl = ipfsToHttp(rig.rigUri);
    if (!metadataUrl) return;

    fetch(metadataUrl)
      .then((res) => res.json())
      .then((metadata) => {
        if (metadata.image) {
          setLogoUrl(ipfsToHttp(metadata.image));
        }
      })
      .catch(() => {
        // Silently fail - will show fallback
      });
  }, [rig.rigUri]);

  return (
    <Link href={`/rig/${rig.address}`} className="block">
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl bg-surface-100 border border-surface-300 hover:border-primary-500/40 transition-all cursor-pointer",
          isNewBump && "animate-bump-enter",
          isTopBump && !isNewBump && "animate-bump-glow"
        )}
      >
        {/* Token Logo */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-200 border border-surface-300 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={rig.tokenSymbol}
              className="w-12 h-12 object-cover"
            />
          ) : (
            <span className="text-primary-500 font-bold text-lg">
              {rig.tokenSymbol.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Token Name & Symbol */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate text-[15px]">
            {rig.tokenName}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-surface-600">{rig.tokenSymbol}</span>
            {rig.capacity > 1n && (
              <span className="badge badge-primary text-[10px] py-0.5 px-1.5">
                {Number(rig.capacity)} slots
              </span>
            )}
          </div>
        </div>

        {/* Price & Market Cap */}
        <div className="flex-shrink-0 text-right">
          <div className="text-[15px] font-semibold text-white">
            ${formatQuote(rig.price)}
          </div>
          <div className="text-sm text-surface-600 mt-0.5">
            {formatUsd(marketCapUsd)}
          </div>
        </div>
      </div>
    </Link>
  );
}
