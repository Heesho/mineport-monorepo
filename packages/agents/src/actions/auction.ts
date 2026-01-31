import { type WalletClient, type PublicClient } from "viem";
import {
  ADDRESSES,
  ERC20_ABI,
  MULTICALL_ABI,
  SPIN_MULTICALL_ABI,
  FUND_MULTICALL_ABI,
  UNIV2_ROUTER_ABI,
  type RigType,
} from "../config";
import type { RigInfo, AuctionState, LPState } from "../state";
import { ensureApproval, deadline } from "./utils";
import { mintDonut } from "./swap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map rig type to its Multicall contract address. */
function multicallAddress(rigType: RigType): `0x${string}` {
  switch (rigType) {
    case "mine":
      return ADDRESSES.mineMulticall as `0x${string}`;
    case "spin":
      return ADDRESSES.spinMulticall as `0x${string}`;
    case "fund":
      return ADDRESSES.fundMulticall as `0x${string}`;
  }
}

/** Map rig type to its Multicall ABI. */
function multicallAbi(rigType: RigType) {
  switch (rigType) {
    case "mine":
      return MULTICALL_ABI;
    case "spin":
      return SPIN_MULTICALL_ABI;
    case "fund":
      return FUND_MULTICALL_ABI;
  }
}

// ---------------------------------------------------------------------------
// executeAuctionBuy
// ---------------------------------------------------------------------------

/**
 * Buy the current auction lot with LP tokens.
 *
 * If the agent does not hold enough LP tokens, it will first add liquidity
 * (Unit + DONUT -> LP) to obtain them.  If the agent lacks DONUT it will
 * mint mock tokens.  If the agent lacks Unit it returns early because it
 * cannot produce LP tokens without Unit.
 */
export async function executeAuctionBuy(
  walletClient: WalletClient,
  publicClient: PublicClient,
  rigInfo: RigInfo,
  auctionState: AuctionState,
  lpState: LPState,
): Promise<`0x${string}`> {
  const agentAddress = walletClient.account!.address;
  const unitAddress = rigInfo.unitAddress;
  const donutAddress = ADDRESSES.donut as `0x${string}`;
  const routerAddress = ADDRESSES.uniV2Router as `0x${string}`;
  const lpAddress = rigInfo.lpAddress;
  const mcAddress = multicallAddress(rigInfo.type);

  // -----------------------------------------------------------------------
  // 1. Check LP balance — do we have enough LP tokens for the auction price?
  // -----------------------------------------------------------------------

  const requiredLP = auctionState.price;

  if (lpState.agentLPBalance < requiredLP) {
    // -------------------------------------------------------------------
    // 2. Add liquidity to obtain LP tokens
    // -------------------------------------------------------------------

    // Figure out how much additional LP we need.
    // We target 120% of the shortfall to give a margin.
    const lpShortfall = requiredLP - lpState.agentLPBalance;
    const targetLP = (lpShortfall * 130n) / 100n; // aim for 30% extra

    // Calculate proportional amounts of Unit and DONUT needed to mint
    // `targetLP` worth of LP tokens.
    // LP minted ~ totalSupply * min(amountUnit/reserveUnit, amountDonut/reserveDonut)
    // So for a given targetLP:
    //   amountUnit  = targetLP * reserveUnit  / totalSupply
    //   amountDonut = targetLP * reserveDonut / totalSupply
    const amountUnit =
      (targetLP * lpState.reserveUnit) / lpState.totalSupply + 1n;
    const amountDonut =
      (targetLP * lpState.reserveDonut) / lpState.totalSupply + 1n;

    // Check agent's Unit balance on chain
    const unitBalance = await publicClient.readContract({
      address: unitAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [agentAddress],
    });

    if (unitBalance < amountUnit) {
      console.log(
        `[auction] Skipping auction buy — insufficient Unit balance. Have ${unitBalance}, need ${amountUnit}`,
      );
      throw new Error(
        "Insufficient Unit balance to add liquidity for auction buy",
      );
    }

    // Check agent's DONUT balance — mint if insufficient
    const donutBalance = await publicClient.readContract({
      address: donutAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [agentAddress],
    });

    if (donutBalance < amountDonut) {
      const mintAmount = amountDonut - donutBalance;
      console.log(
        `[auction] Minting ${mintAmount} DONUT for liquidity add`,
      );
      await mintDonut(walletClient, publicClient, mintAmount);
    }

    // Approve Unit and DONUT to the UniV2 Router
    await Promise.all([
      ensureApproval(
        walletClient,
        publicClient,
        unitAddress,
        routerAddress,
        amountUnit,
      ),
      ensureApproval(
        walletClient,
        publicClient,
        donutAddress,
        routerAddress,
        amountDonut,
      ),
    ]);

    // Add liquidity
    const dl = deadline();
    const addLiqHash = await walletClient.writeContract({
      chain: walletClient.chain,
      account: walletClient.account!,
      address: routerAddress,
      abi: UNIV2_ROUTER_ABI,
      functionName: "addLiquidity",
      args: [
        unitAddress,
        donutAddress,
        amountUnit,
        amountDonut,
        0n, // amountAMin — accept any
        0n, // amountBMin — accept any
        agentAddress,
        dl,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: addLiqHash });
    console.log(
      `[auction] Added liquidity: tx ${addLiqHash}`,
    );
  }

  // -----------------------------------------------------------------------
  // 3. Approve LP token to the multicall contract
  // -----------------------------------------------------------------------

  const maxPayment = (auctionState.price * 120n) / 100n; // 20% slippage buffer

  await ensureApproval(
    walletClient,
    publicClient,
    lpAddress,
    mcAddress,
    maxPayment,
  );

  // -----------------------------------------------------------------------
  // 4. Buy the auction lot
  // -----------------------------------------------------------------------

  const abi = multicallAbi(rigInfo.type);
  const dl = deadline();

  const buyHash = await walletClient.writeContract({
    chain: walletClient.chain,
    account: walletClient.account!,
    address: mcAddress,
    abi,
    functionName: "buy",
    args: [
      rigInfo.address,
      auctionState.epochId,
      dl,
      maxPayment,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: buyHash });
  console.log(
    `[auction] Bought auction lot: tx ${buyHash}`,
  );

  return buyHash;
}
