import { type WalletClient, type PublicClient } from "viem";
import {
  ADDRESSES,
  MULTICALL_ABI,
  SPIN_MULTICALL_ABI,
  FUND_MULTICALL_ABI,
  type RigType,
} from "../config";
import { ensureApproval, deadline } from "./utils";

export type RigActionParams = {
  rigAddress: `0x${string}`;
  rigType: RigType;
  quoteAddress: `0x${string}`;
  slotIndex?: number; // MineRig only
  epochId: bigint;
  maxPrice: bigint;
  entropyFee: bigint; // ETH for VRF (mine/spin only)
  fundAmount?: bigint; // FundRig only
};

export async function executeRigAction(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: RigActionParams,
): Promise<`0x${string}`> {
  const agentAddress = walletClient.account!.address;

  switch (params.rigType) {
    case "mine": {
      // 1. Ensure USDC approval to MineMulticall
      await ensureApproval(
        walletClient,
        publicClient,
        params.quoteAddress,
        ADDRESSES.mineMulticall as `0x${string}`,
        params.maxPrice,
      );
      // 2. Call MineMulticall.mine(rig, index, epochId, deadline, maxPrice, "")
      const hash = await walletClient.writeContract({
        chain: walletClient.chain,
        account: walletClient.account!,
        address: ADDRESSES.mineMulticall as `0x${string}`,
        abi: MULTICALL_ABI,
        functionName: "mine",
        args: [
          params.rigAddress,
          BigInt(params.slotIndex ?? 0),
          params.epochId,
          deadline(),
          params.maxPrice,
          "",
        ],
        value: params.entropyFee,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    case "spin": {
      // 1. Ensure USDC approval to SpinMulticall
      await ensureApproval(
        walletClient,
        publicClient,
        params.quoteAddress,
        ADDRESSES.spinMulticall as `0x${string}`,
        params.maxPrice,
      );
      // 2. Call SpinMulticall.spin(rig, epochId, deadline, maxPrice)
      const hash = await walletClient.writeContract({
        chain: walletClient.chain,
        account: walletClient.account!,
        address: ADDRESSES.spinMulticall as `0x${string}`,
        abi: SPIN_MULTICALL_ABI,
        functionName: "spin",
        args: [
          params.rigAddress,
          params.epochId,
          deadline(),
          params.maxPrice,
        ],
        value: params.entropyFee,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    case "fund": {
      const amount = params.fundAmount!;
      // 1. Ensure USDC approval to FundMulticall
      await ensureApproval(
        walletClient,
        publicClient,
        params.quoteAddress,
        ADDRESSES.fundMulticall as `0x${string}`,
        amount,
      );
      // 2. Call FundMulticall.fund(rig, account, amount)
      const hash = await walletClient.writeContract({
        chain: walletClient.chain,
        account: walletClient.account!,
        address: ADDRESSES.fundMulticall as `0x${string}`,
        abi: FUND_MULTICALL_ABI,
        functionName: "fund",
        args: [params.rigAddress, agentAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }
  }
}
