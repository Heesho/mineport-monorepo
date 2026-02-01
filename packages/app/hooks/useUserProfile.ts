import { useQuery } from "@tanstack/react-query";
import {
  getAccount,
} from "@/lib/subgraph-launchpad";

export type UserRigData = {
  address: `0x${string}`;
  unitAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  rigUri: string;
  miner: `0x${string}`;
  price: bigint;
  totalMinted: bigint;
  userMined: bigint;
  userSpent: bigint;
  userEarned: bigint;
};

export type UserLaunchedRig = {
  address: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  rigUri: string;
  totalMinted: bigint;
  unitPrice: bigint; // price in USDC
  revenue: bigint;
};

export function useUserProfile(accountAddress: `0x${string}` | undefined) {
  // Fetch user account data from subgraph
  const {
    data: accountData,
    isLoading: isLoadingAccount,
    error: accountError,
  } = useQuery({
    queryKey: ["userProfile", accountAddress],
    queryFn: async () => {
      if (!accountAddress) return null;
      return getAccount(accountAddress);
    },
    enabled: !!accountAddress,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Note: RigAccount entity was removed in the schema migration.
  // Per-rig user breakdowns are no longer available from the subgraph.
  // Return empty arrays for minedRigs and launchedRigs until a new
  // query strategy is implemented.

  const minedRigs: UserRigData[] = [];
  const launchedRigs: UserLaunchedRig[] = [];

  const isLoading = isLoadingAccount;

  return {
    accountData,
    minedRigs,
    launchedRigs,
    isLoading,
    error: accountError,
  };
}
