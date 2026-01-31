import { useQuery } from "@tanstack/react-query";
import {
  getAccount,
  type SubgraphAccount,
} from "@/lib/subgraph-launchpad";

export type UserRigStats = {
  totalMined: bigint;
  totalSpent: bigint;
  totalEarned: bigint;
};

function parseAccountStats(account: SubgraphAccount): UserRigStats {
  return {
    totalMined: BigInt(Math.floor(parseFloat(account.totalMined) * 1e18)),
    totalSpent: BigInt(Math.floor(parseFloat(account.totalRigSpend) * 1e18)),
    totalEarned: BigInt(Math.floor(parseFloat(account.totalWon) * 1e18)),
  };
}

/**
 * Get user stats for a specific rig.
 *
 * Note: The RigAccount entity was removed in the schema migration.
 * Per-rig stats are no longer available. This hook now returns null
 * (the per-rig breakdown is not queryable from the subgraph).
 */
export function useUserRigStats(
  userAddress: `0x${string}` | undefined,
  rigAddress: `0x${string}` | undefined
) {
  // RigAccount entity no longer exists -- return null
  return {
    stats: null as UserRigStats | null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: null, error: null }),
  };
}

/**
 * Get aggregate stats across all rigs for a user.
 *
 * Previously used getUserRigAccounts (RigAccount entity).
 * Now uses the Account entity which has aggregate totals.
 */
export function useUserAllStats(userAddress: `0x${string}` | undefined) {
  const { data: account, isLoading, error, refetch } = useQuery({
    queryKey: ["userAllStats", userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      return getAccount(userAddress);
    },
    enabled: !!userAddress,
    staleTime: 30_000,
    retry: false,
  });

  const allStats: UserRigStats[] = account
    ? [parseAccountStats(account)]
    : [];

  return {
    allStats,
    isLoading,
    error,
    refetch,
  };
}
