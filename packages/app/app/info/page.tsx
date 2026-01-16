"use client";

import { NavBar } from "@/components/nav-bar";

const INFO_SECTIONS = [
  {
    title: "What is Franchiser?",
    content:
      "Franchiser is a fair token launch platform where anyone can create their own coin. Every token launched is an extension of the DONUT ecosystem.",
    bullets: [
      "Launch your own token with permanent liquidity",
      "No rug pulls possible - liquidity is locked forever",
      "Fair distribution through mining, not bulk buying",
    ],
  },
  {
    title: "How Mining Works",
    content:
      "Think of each token as a mine. Miners compete for control of the mine to earn tokens.",
    bullets: [
      "Only one active miner at a time",
      "Pay ETH to become the miner and start earning",
      "Price doubles after each purchase, then decays over time",
      "When someone takes over, you get 80% of what they paid",
    ],
  },
  {
    title: "Why It's Fair",
    content: "The Dutch auction system defeats bots and snipers.",
    bullets: [
      "Price starts high and drops over time",
      "Being first means paying the HIGHEST price",
      "Patience wins, not speed - no advantage to bots",
    ],
  },
  {
    title: "Fee Split",
    content: "When someone mines, their payment is split:",
    bullets: [
      "80% → previous miner (reward for holding)",
      "15% → treasury (customizable by creator)",
      "4% → franchise creator",
      "1% → protocol (supports DONUT ecosystem)",
    ],
  },
];

export default function InfoPage() {
  return (
    <main className="flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        {/* Header */}
        <div className="px-4 pb-4">
          <h1 className="text-2xl font-bold">Info</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
          <div className="space-y-4">
            {INFO_SECTIONS.map((section, index) => (
              <div key={index} className="bg-card rounded-xl p-4">
                <h2 className="font-semibold text-primary mb-2">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {section.content}
                </p>
                <ul className="space-y-1.5">
                  {section.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-1">•</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NavBar />
    </main>
  );
}
