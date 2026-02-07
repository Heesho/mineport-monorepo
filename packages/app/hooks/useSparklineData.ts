import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatchSparklineData } from "@/lib/subgraph-launchpad";

type SparklineResult = {
  getSparkline: (unitAddress: string, currentPrice?: number) => number[];
  isLoading: boolean;
};

export function useSparklineData(unitAddresses: string[]): SparklineResult {
  const { data: sparklineMap, isLoading } = useQuery({
    queryKey: ["batchSparklines", unitAddresses.sort().join(",")],
    queryFn: () => getBatchSparklineData(unitAddresses),
    enabled: unitAddresses.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const getSparkline = useMemo(() => {
    return (unitAddress: string, currentPrice: number = 0): number[] => {
      const data = sparklineMap?.get(unitAddress.toLowerCase());

      if (!data || data.length === 0) return [];

      // We have up to 7 days of hourly data (168 points max).
      // Downsample to ~24 points for the sparkline.
      const targetPoints = 24;
      const prices = data.map((d) => d.price);

      let sampled: number[];
      if (prices.length <= targetPoints) {
        sampled = prices;
      } else {
        sampled = [];
        for (let i = 0; i < targetPoints; i++) {
          const idx = Math.floor((i / (targetPoints - 1)) * (prices.length - 1));
          sampled.push(prices[idx]);
        }
      }

      // Append current price as latest point
      if (currentPrice > 0) {
        sampled.push(currentPrice);
      }

      return sampled;
    };
  }, [sparklineMap]);

  return {
    getSparkline,
    isLoading,
  };
}
