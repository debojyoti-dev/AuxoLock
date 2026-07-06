import { BrowserProvider } from "ethers";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { APP_CONFIG } from "../config/env";

type WalletContextShape = {
  account: string;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  ensureFuji: () => Promise<void>;
};

const WalletContext = createContext<WalletContextShape | null>(null);

function getEthereum() {
  return (window as Window & { ethereum?: any }).ethereum;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  async function ensureFuji() {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: APP_CONFIG.chainIdHex }],
      });
    } catch {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: APP_CONFIG.chainIdHex,
            chainName: APP_CONFIG.chainName,
            rpcUrls: APP_CONFIG.rpcUrls,
            nativeCurrency: APP_CONFIG.nativeCurrency,
            blockExplorerUrls: APP_CONFIG.blockExplorerUrls,
          },
        ],
      });
    }
  }

  async function connect() {
    const ethereum = getEthereum();
    if (!ethereum) {
      alert("Install MetaMask to continue.");
      return;
    }

    await ensureFuji();
    const browserProvider = new BrowserProvider(ethereum);
    const accounts = (await browserProvider.send("eth_requestAccounts", [])) as string[];
    setAccount(accounts[0] ?? "");
    setProvider(browserProvider);
  }

  const value = useMemo(
    () => ({
      account,
      provider,
      connect,
      ensureFuji,
    }),
    [account, provider],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return context;
}
