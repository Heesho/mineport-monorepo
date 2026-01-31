import { createWalletClient, http, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { AgentConfig } from "./config";
import { ADDRESSES, MOCK_TOKEN_ABI } from "./config";
import { detectRigType, resolveRigInfo, readWorldState, type RigInfo } from "./state";
import { pickAction, type ScoredAction } from "./scoring";
import { executeRigAction } from "./actions/rig-action";
import { executeBuy, executeSell, mintDonut, mintUsdc } from "./actions/swap";
import { executeAuctionBuy } from "./actions/auction";
import { executeClaim } from "./actions/claim";

export class Agent {
  name: string;
  config: AgentConfig;
  walletClient: WalletClient;
  publicClient: PublicClient;
  rigInfos: RigInfo[];
  tickCount: number;
  initialized: boolean;

  constructor(config: AgentConfig, publicClient: PublicClient) {
    this.name = config.name;
    this.config = config;
    this.publicClient = publicClient;
    this.rigInfos = [];
    this.tickCount = 0;
    this.initialized = false;

    const account = privateKeyToAccount(config.privateKey);
    this.walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.RPC_URL ?? "https://base.llamarpc.com"),
    });
  }

  get address(): `0x${string}` {
    return this.walletClient.account!.address;
  }

  /** One-time setup: detect rig types, resolve addresses, mint initial tokens if needed */
  async initialize(): Promise<void> {
    // 1. For each rig address, detect type and resolve metadata
    for (const rigAddress of this.config.rigs) {
      const rigType = await detectRigType(this.publicClient, rigAddress);
      const rigInfo = await resolveRigInfo(this.publicClient, rigAddress, rigType);
      this.rigInfos.push(rigInfo);
      this.log(`  rig ${rigAddress} → ${rigType} (unit: ${rigInfo.unitAddress})`);
    }

    // 2. Check balances, mint mock tokens if low
    const [ethBalance, usdcBalance, donutBalance] = await Promise.all([
      this.publicClient.getBalance({ address: this.address }),
      this.publicClient.readContract({
        address: ADDRESSES.usdc as `0x${string}`,
        abi: [{inputs:[{name:"account",type:"address"}],name:"balanceOf",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"}] as const,
        functionName: "balanceOf",
        args: [this.address],
      }),
      this.publicClient.readContract({
        address: ADDRESSES.donut as `0x${string}`,
        abi: [{inputs:[{name:"account",type:"address"}],name:"balanceOf",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"}] as const,
        functionName: "balanceOf",
        args: [this.address],
      }),
    ]);

    this.log(`  balances: ${ethBalance} ETH, ${usdcBalance} USDC, ${donutBalance} DONUT`);

    // Mint USDC if < 1000 (6 decimals)
    if (usdcBalance < 1000n * 10n**6n) {
      this.log("  minting 10,000 USDC...");
      await mintUsdc(this.walletClient, this.publicClient, 10_000n * 10n**6n);
    }

    // Mint DONUT if < 1000 (18 decimals)
    if (donutBalance < 1000n * 10n**18n) {
      this.log("  minting 10,000 DONUT...");
      await mintDonut(this.walletClient, this.publicClient, 10_000n * 10n**18n);
    }

    this.initialized = true;
  }

  /** Single heartbeat tick */
  async tick(): Promise<void> {
    this.tickCount++;
    try {
      // 1. Read world state
      const world = await readWorldState(this.publicClient, this.address, this.rigInfos);

      // 2. Score and pick action
      const action = pickAction(world, this.config);

      // 3. Execute
      if (action.type === "idle") {
        this.log(`tick #${this.tickCount} — idle`);
        return;
      }

      this.log(`tick #${this.tickCount} — ${action.type}...`);
      const txHash = await this.execute(action);
      if (txHash) {
        this.log(`  tx: ${txHash}`);
      } else {
        this.log(`  (no tx)`);
      }
    } catch (err) {
      this.log(`tick #${this.tickCount} — error: ${(err as Error).message}`);
    }
  }

  /** Execute a scored action */
  private async execute(action: ScoredAction): Promise<`0x${string}` | null> {
    switch (action.type) {
      case "claim":
        return executeClaim(this.walletClient, this.publicClient, action.rigState);
      case "rig-action":
        return executeRigAction(this.walletClient, this.publicClient, action.params);
      case "buy":
        return executeBuy(this.walletClient, this.publicClient, action.unitAddress, action.amount);
      case "sell":
        return executeSell(this.walletClient, this.publicClient, action.unitAddress, action.amount);
      case "auction":
        return executeAuctionBuy(this.walletClient, this.publicClient, action.rigInfo, action.auctionState, action.lpState);
      default:
        return null;
    }
  }

  /** Start the heartbeat loop */
  start(): void {
    const scheduleNext = () => {
      const [min, max] = this.config.heartbeatRange;
      const delay = (min + Math.random() * (max - min)) * 1000;
      setTimeout(async () => {
        await this.tick();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    this.log("heartbeat started");
  }

  private log(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] [${this.name}] ${msg}`);
  }
}
