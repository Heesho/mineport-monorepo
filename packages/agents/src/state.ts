import type { PublicClient, Address } from "viem";
import {
  ADDRESSES,
  CORE_ABI,
  MULTICALL_ABI,
  SPIN_MULTICALL_ABI,
  FUND_MULTICALL_ABI,
  ERC20_ABI,
  UNIV2_PAIR_ABI,
  type RigType,
} from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RigInfo = {
  address: Address;
  type: RigType;
  unitAddress: Address;
  auctionAddress: Address;
  lpAddress: Address;
  quoteAddress: Address;
};

export type MineRigState = {
  rig: RigInfo;
  epochId: bigint;
  initPrice: bigint;
  price: bigint;
  capacity: bigint;
  entropyFee: bigint;
  unitPrice: bigint;
  accountClaimable: bigint;
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;
  accountDonutBalance: bigint;
};

export type SpinRigState = {
  rig: RigInfo;
  epochId: bigint;
  initPrice: bigint;
  price: bigint;
  prizePool: bigint;
  pendingEmissions: bigint;
  entropyFee: bigint;
  unitPrice: bigint;
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;
  accountDonutBalance: bigint;
};

export type FundRigState = {
  rig: RigInfo;
  currentDay: bigint;
  todayEmission: bigint;
  todayTotalDonated: bigint;
  unitPrice: bigint;
  accountUnitBalance: bigint;
  accountQuoteBalance: bigint;
  accountDonutBalance: bigint;
  accountTodayDonation: bigint;
  pendingRewards: bigint;
  unclaimedDays: bigint[];
};

export type AuctionState = {
  epochId: bigint;
  price: bigint;
  quoteAccumulated: bigint;
  paymentTokenPrice: bigint;
  accountLPBalance: bigint;
};

export type LPState = {
  lpAddress: Address;
  reserveUnit: bigint;
  reserveDonut: bigint;
  totalSupply: bigint;
  agentLPBalance: bigint;
};

export type WorldState = {
  ethBalance: bigint;
  usdcBalance: bigint;
  donutBalance: bigint;
  rigs: Array<{
    state: MineRigState | SpinRigState | FundRigState;
    auction: AuctionState;
    lp: LPState;
  }>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map rig type to its Core contract address. */
function coreAddress(rigType: RigType): Address {
  switch (rigType) {
    case "mine":
      return ADDRESSES.mineCore as Address;
    case "spin":
      return ADDRESSES.spinCore as Address;
    case "fund":
      return ADDRESSES.fundCore as Address;
  }
}

/** Map rig type to its Multicall contract address. */
function multicallAddress(rigType: RigType): Address {
  switch (rigType) {
    case "mine":
      return ADDRESSES.mineMulticall as Address;
    case "spin":
      return ADDRESSES.spinMulticall as Address;
    case "fund":
      return ADDRESSES.fundMulticall as Address;
  }
}

/** Map rig type to its Multicall ABI (for getAuction). */
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
// Rig type cache (rig type never changes once deployed)
// ---------------------------------------------------------------------------

const rigTypeCache = new Map<Address, RigType>();

// ---------------------------------------------------------------------------
// detectRigType
// ---------------------------------------------------------------------------

/**
 * Detect the rig type by calling `isDeployedRig` on each Core contract.
 * Result is cached — a rig's type never changes.
 */
export async function detectRigType(
  publicClient: PublicClient,
  rigAddress: Address,
): Promise<RigType> {
  const cached = rigTypeCache.get(rigAddress);
  if (cached) return cached;

  const results = await publicClient.multicall({
    contracts: [
      {
        address: ADDRESSES.mineCore as Address,
        abi: CORE_ABI,
        functionName: "isDeployedRig",
        args: [rigAddress],
      },
      {
        address: ADDRESSES.spinCore as Address,
        abi: CORE_ABI,
        functionName: "isDeployedRig",
        args: [rigAddress],
      },
      {
        address: ADDRESSES.fundCore as Address,
        abi: CORE_ABI,
        functionName: "isDeployedRig",
        args: [rigAddress],
      },
    ],
    allowFailure: false,
  });

  const [isMine, isSpin, isFund] = results;

  let rigType: RigType;
  if (isMine) rigType = "mine";
  else if (isSpin) rigType = "spin";
  else if (isFund) rigType = "fund";
  else throw new Error(`Address ${rigAddress} is not a deployed rig on any Core`);

  rigTypeCache.set(rigAddress, rigType);
  return rigType;
}

// ---------------------------------------------------------------------------
// resolveRigInfo
// ---------------------------------------------------------------------------

/**
 * Read the static mappings (unit, auction, LP, quote) from the correct Core
 * for a given rig address and type.
 */
export async function resolveRigInfo(
  publicClient: PublicClient,
  rigAddress: Address,
  rigType: RigType,
): Promise<RigInfo> {
  const core = coreAddress(rigType);

  const [unitAddress, auctionAddress, lpAddress, quoteAddress] =
    await publicClient.multicall({
      contracts: [
        {
          address: core,
          abi: CORE_ABI,
          functionName: "rigToUnit",
          args: [rigAddress],
        },
        {
          address: core,
          abi: CORE_ABI,
          functionName: "rigToAuction",
          args: [rigAddress],
        },
        {
          address: core,
          abi: CORE_ABI,
          functionName: "rigToLP",
          args: [rigAddress],
        },
        {
          address: core,
          abi: CORE_ABI,
          functionName: "rigToQuote",
          args: [rigAddress],
        },
      ],
      allowFailure: false,
    });

  return {
    address: rigAddress,
    type: rigType,
    unitAddress,
    auctionAddress,
    lpAddress,
    quoteAddress,
  };
}

// ---------------------------------------------------------------------------
// Internal: read rig state per type
// ---------------------------------------------------------------------------

async function readMineRigState(
  publicClient: PublicClient,
  agentAddress: Address,
  rig: RigInfo,
): Promise<MineRigState> {
  // MineMulticall.getRig(rig, index=0, account)
  const state = await publicClient.readContract({
    address: multicallAddress("mine"),
    abi: MULTICALL_ABI,
    functionName: "getRig",
    args: [rig.address, 0n, agentAddress],
  });

  return {
    rig,
    epochId: state.epochId,
    initPrice: state.initPrice,
    price: state.price,
    capacity: state.capacity,
    entropyFee: state.entropyFee,
    unitPrice: state.unitPrice,
    accountClaimable: state.accountClaimable,
    accountUnitBalance: state.accountUnitBalance,
    accountQuoteBalance: state.accountQuoteBalance,
    accountDonutBalance: state.accountDonutBalance,
  };
}

async function readSpinRigState(
  publicClient: PublicClient,
  agentAddress: Address,
  rig: RigInfo,
): Promise<SpinRigState> {
  // SpinMulticall.getRig(rig, account)
  const state = await publicClient.readContract({
    address: multicallAddress("spin"),
    abi: SPIN_MULTICALL_ABI,
    functionName: "getRig",
    args: [rig.address, agentAddress],
  });

  return {
    rig,
    epochId: state.epochId,
    initPrice: state.initPrice,
    price: state.price,
    prizePool: state.prizePool,
    pendingEmissions: state.pendingEmissions,
    entropyFee: state.entropyFee,
    unitPrice: state.unitPrice,
    accountUnitBalance: state.accountUnitBalance,
    accountQuoteBalance: state.accountQuoteBalance,
    accountDonutBalance: state.accountDonutBalance,
  };
}

async function readFundRigState(
  publicClient: PublicClient,
  agentAddress: Address,
  rig: RigInfo,
): Promise<FundRigState> {
  // FundMulticall.getRig(rig, account)
  const rigState = await publicClient.readContract({
    address: multicallAddress("fund"),
    abi: FUND_MULTICALL_ABI,
    functionName: "getRig",
    args: [rig.address, agentAddress],
  });

  const currentDay = rigState.currentDay;

  // FundMulticall.getTotalPendingRewards(rig, account, 0, currentDay)
  // Returns [totalPending, unclaimedDays[]]
  let pendingRewards = 0n;
  let unclaimedDays: bigint[] = [];

  if (currentDay > 0n) {
    const [totalPending, unclaimed] = await publicClient.readContract({
      address: multicallAddress("fund"),
      abi: FUND_MULTICALL_ABI,
      functionName: "getTotalPendingRewards",
      args: [rig.address, agentAddress, 0n, currentDay],
    });
    pendingRewards = totalPending;
    unclaimedDays = [...unclaimed];
  }

  return {
    rig,
    currentDay,
    todayEmission: rigState.todayEmission,
    todayTotalDonated: rigState.todayTotalDonated,
    unitPrice: rigState.unitPrice,
    accountUnitBalance: rigState.accountUnitBalance,
    // FundRig returns accountPaymentTokenBalance instead of accountQuoteBalance
    accountQuoteBalance: rigState.accountPaymentTokenBalance,
    accountDonutBalance: rigState.accountDonutBalance,
    accountTodayDonation: rigState.accountTodayDonation,
    pendingRewards,
    unclaimedDays,
  };
}

// ---------------------------------------------------------------------------
// Internal: read auction state
// ---------------------------------------------------------------------------

async function readAuctionState(
  publicClient: PublicClient,
  agentAddress: Address,
  rig: RigInfo,
): Promise<AuctionState> {
  const abi = multicallAbi(rig.type);
  const addr = multicallAddress(rig.type);

  const state = await publicClient.readContract({
    address: addr,
    abi,
    functionName: "getAuction",
    args: [rig.address, agentAddress],
  });

  return {
    epochId: state.epochId,
    price: state.price,
    quoteAccumulated: state.quoteAccumulated,
    paymentTokenPrice: state.paymentTokenPrice,
    // accountPaymentTokenBalance is the agent's LP token balance
    accountLPBalance: state.accountPaymentTokenBalance,
  };
}

// ---------------------------------------------------------------------------
// Internal: read LP state
// ---------------------------------------------------------------------------

async function readLPState(
  publicClient: PublicClient,
  agentAddress: Address,
  rig: RigInfo,
): Promise<LPState> {
  const lpAddress = rig.lpAddress;
  const donutAddress = ADDRESSES.donut as Address;

  // Batch: getReserves, token0, totalSupply, balanceOf(agent)
  const [reserves, token0, totalSupply, agentLPBalance] =
    await publicClient.multicall({
      contracts: [
        {
          address: lpAddress,
          abi: UNIV2_PAIR_ABI,
          functionName: "getReserves",
        },
        {
          address: lpAddress,
          abi: UNIV2_PAIR_ABI,
          functionName: "token0",
        },
        {
          address: lpAddress,
          abi: UNIV2_PAIR_ABI,
          functionName: "totalSupply",
        },
        {
          address: lpAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [agentAddress],
        },
      ],
      allowFailure: false,
    });

  // Determine which reserve is Unit vs DONUT based on token0
  const token0IsDonut =
    token0.toLowerCase() === donutAddress.toLowerCase();
  const reserveUnit = token0IsDonut ? reserves[1] : reserves[0];
  const reserveDonut = token0IsDonut ? reserves[0] : reserves[1];

  return {
    lpAddress,
    reserveUnit,
    reserveDonut,
    totalSupply,
    agentLPBalance,
  };
}

// ---------------------------------------------------------------------------
// readWorldState
// ---------------------------------------------------------------------------

/**
 * Read the full world state for the agent across all rigs.
 * Batches reads where possible for efficiency.
 */
export async function readWorldState(
  publicClient: PublicClient,
  agentAddress: Address,
  rigInfos: RigInfo[],
): Promise<WorldState> {
  // 1. Read agent balances (ETH, USDC, DONUT) in parallel with rig reads
  const balancePromise = publicClient.multicall({
    contracts: [
      {
        address: ADDRESSES.usdc as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [agentAddress],
      },
      {
        address: ADDRESSES.donut as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [agentAddress],
      },
    ],
    allowFailure: false,
  });

  const ethBalancePromise = publicClient.getBalance({ address: agentAddress });

  // 2. Read each rig's state, auction, and LP in parallel
  const rigPromises = rigInfos.map(async (rig) => {
    // Read rig state based on type
    let statePromise: Promise<MineRigState | SpinRigState | FundRigState>;
    switch (rig.type) {
      case "mine":
        statePromise = readMineRigState(publicClient, agentAddress, rig);
        break;
      case "spin":
        statePromise = readSpinRigState(publicClient, agentAddress, rig);
        break;
      case "fund":
        statePromise = readFundRigState(publicClient, agentAddress, rig);
        break;
    }

    const [state, auction, lp] = await Promise.all([
      statePromise,
      readAuctionState(publicClient, agentAddress, rig),
      readLPState(publicClient, agentAddress, rig),
    ]);

    return { state, auction, lp };
  });

  // 3. Wait for everything
  const [tokenBalances, ethBalance, ...rigResults] = await Promise.all([
    balancePromise,
    ethBalancePromise,
    ...rigPromises,
  ]);

  const [usdcBalance, donutBalance] = tokenBalances;

  return {
    ethBalance,
    usdcBalance,
    donutBalance,
    rigs: rigResults,
  };
}
