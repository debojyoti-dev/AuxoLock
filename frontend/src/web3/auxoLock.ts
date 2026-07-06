import { BrowserProvider, Contract, parseEther } from "ethers";
import { auxoLockAbi } from "../abi/auxoLockAbi";
import { APP_CONFIG } from "../config/env";
import type { LeaseView } from "../types/lease";

function contract(provider: BrowserProvider) {
  if (!APP_CONFIG.contractAddress) {
    throw new Error("Set VITE_AUXOLOCK_ADDRESS in frontend/.env");
  }
  return new Contract(APP_CONFIG.contractAddress, auxoLockAbi, provider);
}

export async function createLease(
  provider: BrowserProvider,
  tenant: string,
  depositAvax: string,
  durationDays: number,
  propertyDetails: string,
) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.createLease(tenant, parseEther(depositAvax), durationDays, propertyDetails);
  return tx.wait();
}

export async function depositFunds(provider: BrowserProvider, leaseId: number, depositAvax: string) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.depositFunds(leaseId, { value: parseEther(depositAvax) });
  return tx.wait();
}

export async function getLeaseDetails(provider: BrowserProvider, leaseId: number): Promise<LeaseView> {
  const c = contract(provider) as any;
  return c.getLeaseDetails(leaseId) as Promise<LeaseView>;
}

export async function getMyLeases(provider: BrowserProvider, account: string): Promise<bigint[]> {
  const c = contract(provider) as any;
  return c.getUserLeases(account) as Promise<bigint[]>;
}

export async function getYieldInfo(provider: BrowserProvider, leaseId: number) {
  const c = contract(provider) as any;
  const projected = (await c.calculateYield(leaseId)) as bigint;
  const safe = (await c.getSafeYield(leaseId)) as bigint;
  return { projected, safe };
}

export async function proposeSettlement(provider: BrowserProvider, leaseId: number, damagesAvax: string) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.proposeSettlement(leaseId, parseEther(damagesAvax));
  return tx.wait();
}

export async function acceptSettlement(provider: BrowserProvider, leaseId: number) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.acceptSettlement(leaseId);
  return tx.wait();
}

export async function disputeSettlement(provider: BrowserProvider, leaseId: number) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.disputeSettlement(leaseId);
  return tx.wait();
}

export async function resolveDispute(provider: BrowserProvider, leaseId: number, finalDamagesAvax: string) {
  const signer = await provider.getSigner();
  const c = contract(provider).connect(signer) as any;
  const tx = await c.resolveDispute(leaseId, parseEther(finalDamagesAvax));
  return tx.wait();
}
