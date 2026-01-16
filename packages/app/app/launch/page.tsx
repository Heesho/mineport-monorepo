"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";

export default function LaunchPage() {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = tokenName.length > 0 && tokenSymbol.length > 0;

  return (
    <main className="flex h-screen w-screen justify-center bg-zinc-800">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col bg-background"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 160px)",
        }}
      >
        {/* Header */}
        <div className="px-4 pb-4">
          <h1 className="text-2xl font-bold mb-2">Launch Token</h1>
          <p className="text-sm text-muted-foreground">
            Create your own token in seconds
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <div className="w-24 h-24 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Token logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Logo</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Token Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Token Name</label>
              <input
                type="text"
                placeholder="e.g., Donut"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Token Symbol */}
            <div>
              <label className="block text-sm font-medium mb-2">Symbol</label>
              <input
                type="text"
                placeholder="e.g., DONUT"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full h-12 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                placeholder="Describe your token..."
                value={tokenDescription}
                onChange={(e) => setTokenDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Fee Card */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Launch Fee</span>
                <span className="font-semibold">1,000 DONUT</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">≈</span>
                <span className="text-muted-foreground">$1.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div
          className="fixed left-0 right-0 bg-background border-t border-border"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
        >
          <div className="max-w-[520px] mx-auto px-4 py-4">
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!isFormValid}
            >
              Launch Token
            </Button>
            {!isFormValid && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Enter token name and symbol to continue
              </p>
            )}
          </div>
        </div>
      </div>
      <NavBar />
    </main>
  );
}
