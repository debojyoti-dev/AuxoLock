import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import "dotenv/config";

const fujiRpcUrl = process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const privateKey = process.env.PRIVATE_KEY;
const snowtraceApiKey = process.env.SNOWTRACE_API_KEY ?? "";
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY;

const optionalSepoliaNetwork =
  sepoliaRpcUrl && sepoliaPrivateKey
    ? {
        sepolia: {
          type: "http" as const,
          chainType: "l1" as const,
          url: sepoliaRpcUrl,
          accounts: [sepoliaPrivateKey],
        },
      }
    : {};

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    ...optionalSepoliaNetwork,
    fuji: {
      type: "http",
      chainType: "l1",
      url: fujiRpcUrl,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: snowtraceApiKey,
    },
  },
});
