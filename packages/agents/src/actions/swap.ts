import { type WalletClient, type PublicClient } from "viem";
import { ADDRESSES, MOCK_TOKEN_ABI, UNIV2_SWAP_ABI } from "../config";
import { ensureApproval, deadline } from "./utils";

// ---------------------------------------------------------------------------
// Mock token minting
// ---------------------------------------------------------------------------

/** Mint mock USDC tokens to the agent's address. */
export async function mintUsdc(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amount: bigint,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    chain: walletClient.chain,
    account: walletClient.account!,
    address: ADDRESSES.usdc as `0x${string}`,
    abi: MOCK_TOKEN_ABI,
    functionName: "mint",
    args: [walletClient.account!.address, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ---------------------------------------------------------------------------
// LP swaps
// ---------------------------------------------------------------------------

/**
 * Buy Unit tokens by swapping USDC -> Unit on the Uniswap V2 LP.
 *
 * 1. Approve USDC to UniV2Router
 * 2. Get expected output via getAmountsOut
 * 3. Apply 2 % slippage tolerance
 * 4. Execute swapExactTokensForTokens
 */
export async function executeBuy(
  walletClient: WalletClient,
  publicClient: PublicClient,
  unitAddress: `0x${string}`,
  usdcAmountIn: bigint,
): Promise<`0x${string}`> {
  const router = ADDRESSES.uniV2Router as `0x${string}`;
  const usdc = ADDRESSES.usdc as `0x${string}`;
  const agentAddress = walletClient.account!.address;

  // 1. Ensure USDC approval to router
  await ensureApproval(walletClient, publicClient, usdc, router, usdcAmountIn);

  // 2. Get expected output amount
  const path: readonly `0x${string}`[] = [usdc, unitAddress];
  const amounts = await publicClient.readContract({
    address: router,
    abi: UNIV2_SWAP_ABI,
    functionName: "getAmountsOut",
    args: [usdcAmountIn, path as unknown as readonly `0x${string}`[]],
  });
  const expectedOut = amounts[1];

  // 3. Apply 2 % slippage
  const amountOutMin = (expectedOut * 98n) / 100n;

  // 4. Execute swap
  const hash = await walletClient.writeContract({
    chain: walletClient.chain,
    account: walletClient.account!,
    address: router,
    abi: UNIV2_SWAP_ABI,
    functionName: "swapExactTokensForTokens",
    args: [
      usdcAmountIn,
      amountOutMin,
      path as unknown as readonly `0x${string}`[],
      agentAddress,
      deadline(),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Sell Unit tokens by swapping Unit -> USDC on the Uniswap V2 LP.
 *
 * 1. Approve Unit to UniV2Router
 * 2. Get expected output via getAmountsOut
 * 3. Apply 2 % slippage tolerance
 * 4. Execute swapExactTokensForTokens
 */
export async function executeSell(
  walletClient: WalletClient,
  publicClient: PublicClient,
  unitAddress: `0x${string}`,
  unitAmountIn: bigint,
): Promise<`0x${string}`> {
  const router = ADDRESSES.uniV2Router as `0x${string}`;
  const usdc = ADDRESSES.usdc as `0x${string}`;
  const agentAddress = walletClient.account!.address;

  // 1. Ensure Unit approval to router
  await ensureApproval(walletClient, publicClient, unitAddress, router, unitAmountIn);

  // 2. Get expected output amount
  const path: readonly `0x${string}`[] = [unitAddress, usdc];
  const amounts = await publicClient.readContract({
    address: router,
    abi: UNIV2_SWAP_ABI,
    functionName: "getAmountsOut",
    args: [unitAmountIn, path as unknown as readonly `0x${string}`[]],
  });
  const expectedOut = amounts[1];

  // 3. Apply 2 % slippage
  const amountOutMin = (expectedOut * 98n) / 100n;

  // 4. Execute swap
  const hash = await walletClient.writeContract({
    chain: walletClient.chain,
    account: walletClient.account!,
    address: router,
    abi: UNIV2_SWAP_ABI,
    functionName: "swapExactTokensForTokens",
    args: [
      unitAmountIn,
      amountOutMin,
      path as unknown as readonly `0x${string}`[],
      agentAddress,
      deadline(),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
