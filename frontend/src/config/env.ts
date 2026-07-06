export const APP_CONFIG = {
  chainIdHex: "0xa869", // Avalanche Fuji
  chainName: "Avalanche Fuji C-Chain",
  rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.snowtrace.io"],
  contractAddress: import.meta.env.VITE_AUXOLOCK_ADDRESS ?? "",
} as const;
