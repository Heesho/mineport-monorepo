import { type WalletClient, type PublicClient } from "viem";
import { ADDRESSES, RIG_ABI, FUND_MULTICALL_ABI } from "../config";
import type { MineRigState, SpinRigState, FundRigState } from "../state";

/**
 * Claim miner fees (MineRig) or daily fund rewards (FundRig).
 * SpinRig has no claim action — winnings are sent via VRF callback.
 *
 * Returns the transaction hash, or `null` if there is nothing to claim.
 */
export async function executeClaim(
  walletClient: WalletClient,
  publicClient: PublicClient,
  rigState: MineRigState | SpinRigState | FundRigState,
): Promise<`0x${string}` | null> {
  const agentAddress = walletClient.account!.address;

  switch (rigState.rig.type) {
    case "mine": {
      const state = rigState as MineRigState;
      if (state.accountClaimable <= 0n) {
        return null;
      }
      // Call MineRig.claim(agentAddress) directly on the rig contract
      const hash = await walletClient.writeContract({
        chain: walletClient.chain,
        account: walletClient.account!,
        address: state.rig.address,
        abi: RIG_ABI,
        functionName: "claim",
        args: [agentAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    case "fund": {
      const state = rigState as FundRigState;
      if (state.unclaimedDays.length === 0) {
        return null;
      }
      // Call FundMulticall.claimMultiple(rig, agentAddress, dayIds)
      const hash = await walletClient.writeContract({
        chain: walletClient.chain,
        account: walletClient.account!,
        address: ADDRESSES.fundMulticall as `0x${string}`,
        abi: FUND_MULTICALL_ABI,
        functionName: "claimMultiple",
        args: [state.rig.address, agentAddress, state.unclaimedDays],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    case "spin": {
      // SpinRig has no claim action — winnings sent via VRF callback
      return null;
    }
  }
}
