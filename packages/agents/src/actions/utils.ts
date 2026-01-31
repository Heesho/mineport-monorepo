import { type WalletClient, type PublicClient } from "viem";
import { ERC20_ABI } from "../config";

export async function ensureApproval(
  walletClient: WalletClient,
  publicClient: PublicClient,
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Promise<void> {
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [walletClient.account!.address, spender],
  });
  if (allowance < amount) {
    const hash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account!,
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount * 10n], // approve 10x to reduce future approvals
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

/** Returns a deadline 5 minutes from now */
export function deadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 300);
}
