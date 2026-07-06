import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const selectedNetwork = process.env.HARDHAT_NETWORK ?? "unknown";

  if (selectedNetwork !== "fuji") {
    console.warn(`Warning: deploying on '${selectedNetwork}', expected 'fuji' for demo`);
  }

  const [deployer] = await ethers.getSigners();
  const arbiterAddress = deployer.address;

  console.log("Deploying AuxoLock...");
  console.log("Network:", selectedNetwork);
  console.log("Deployer:", deployer.address);
  console.log("Arbiter:", arbiterAddress);

  const factory = await ethers.getContractFactory("AuxoLock");
  const contract = await factory.deploy(arbiterAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();

  console.log("AuxoLock deployed at:", address);
  if (tx) {
    console.log("Deployment tx:", tx.hash);
  }

  console.log("\nNext steps:");
  console.log(`1) Set frontend/.env VITE_AUXOLOCK_ADDRESS=${address}`);
  console.log("2) Verify contract after propagation:");
  console.log(`   npx hardhat verify --network fuji ${address} ${arbiterAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
