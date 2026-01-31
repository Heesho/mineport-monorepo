import { useQuery } from "@tanstack/react-query";
import { getEpochs, getUnitHourData, getUnitDayData, type SubgraphEpoch, type SubgraphUnitCandle } from "@/lib/subgraph-launchpad";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Timeframe = "1H" | "1D" | "1W" | "1M" | "ALL";

type ChartDataPoint = { time: string; price: number };

// ---------------------------------------------------------------------------
// Timeframe configuration
// ---------------------------------------------------------------------------

function getTimeframeConfig(timeframe: Timeframe) {
  const now = Math.floor(Date.now() / 1000);

  switch (timeframe) {
    case "1H":
      return {
        sinceTimestamp: now - 3600,
        refetchInterval: 30_000,
      };
    case "1D":
      return {
        sinceTimestamp: now - 86400,
        refetchInterval: 30_000,
      };
    case "1W":
      return {
        sinceTimestamp: now - 7 * 86400,
        refetchInterval: 60_000,
      };
    case "1M":
      return {
        sinceTimestamp: now - 30 * 86400,
        refetchInterval: 60_000,
      };
    case "ALL":
      return {
        sinceTimestamp: 0,
        refetchInterval: 60_000,
      };
  }
}

// ---------------------------------------------------------------------------
// Fetch price history from epochs (mining cost over time) — legacy fallback
// ---------------------------------------------------------------------------

async function fetchPriceHistory(
  rigAddress: string,
  timeframe: Timeframe,
): Promise<ChartDataPoint[]> {
  const config = getTimeframeConfig(timeframe);

  // Fetch all available epochs (up to 1000)
  const epochs = await getEpochs(rigAddress, 1000, 0);

  if (!epochs || epochs.length === 0) return [];

  // Epochs come in desc order (newest first) — reverse to chronological
  const sorted = [...epochs].reverse();

  // Filter by timeframe
  const filtered =
    config.sinceTimestamp > 0
      ? sorted.filter((e) => parseInt(e.startTime) >= config.sinceTimestamp)
      : sorted;

  if (filtered.length === 0) return [];

  return filtered.map((epoch: SubgraphEpoch) => ({
    time: new Date(parseInt(epoch.startTime) * 1000).toISOString(),
    price: parseFloat(epoch.spent),
  }));
}

// ---------------------------------------------------------------------------
// Fetch price history from LP candle data (works for all rig types)
// ---------------------------------------------------------------------------

async function fetchCandlePriceHistory(
  unitAddress: string,
  timeframe: Timeframe,
): Promise<ChartDataPoint[]> {
  const config = getTimeframeConfig(timeframe);

  // Use hourly data for short timeframes, daily for longer ones
  const useHourly = timeframe === "1H" || timeframe === "1D";

  const candles = useHourly
    ? await getUnitHourData(unitAddress, config.sinceTimestamp)
    : await getUnitDayData(unitAddress, config.sinceTimestamp);

  if (!candles || candles.length === 0) return [];

  return candles.map((c: SubgraphUnitCandle) => ({
    time: new Date(parseInt(c.timestamp) * 1000).toISOString(),
    price: parseFloat(c.close),
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePriceHistory(
  rigAddress: string,
  timeframe: Timeframe,
  unitAddress?: string,
): { data: ChartDataPoint[]; isLoading: boolean } {
  const config = getTimeframeConfig(timeframe);

  const { data, isLoading } = useQuery({
    queryKey: ["priceHistory", rigAddress, timeframe, unitAddress],
    queryFn: () =>
      unitAddress
        ? fetchCandlePriceHistory(unitAddress.toLowerCase(), timeframe)
        : fetchPriceHistory(rigAddress.toLowerCase(), timeframe),
    enabled: !!rigAddress,
    staleTime: config.refetchInterval,
    refetchInterval: config.refetchInterval,
    placeholderData: (previousData) => previousData,
  });

  return {
    data: data ?? [],
    isLoading,
  };
}
