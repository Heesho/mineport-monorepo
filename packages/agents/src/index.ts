import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";
import { loadAgentConfigs } from "./config";
import { Agent } from "./agent";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "https://base.llamarpc.com";
  const configs = loadAgentConfigs();

  if (configs.length === 0) {
    console.error("No agent keys configured. Set AGENT_KEYS in .env");
    process.exit(1);
  }

  console.log(`Starting ${configs.length} agent(s)...`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Target rigs: ${configs[0].rigs.join(", ")}`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  }) as unknown as PublicClient;

  const agents: Agent[] = [];

  for (const config of configs) {
    const agent = new Agent(config, publicClient);
    await agent.initialize();
    agents.push(agent);
    console.log(`  ${agent.name} (${agent.address}) initialized`);
  }

  // Start all agents
  for (const agent of agents) {
    agent.start();
  }

  console.log("\nAll agents running. Press Ctrl+C to stop.\n");

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
