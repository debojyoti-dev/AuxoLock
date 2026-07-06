import { formatEther } from "ethers";
import { LEASE_STATE_LABELS, type LeaseState } from "../types/lease";

export function fmtAvax(value: bigint): string {
  return Number(formatEther(value)).toFixed(4);
}

export function fmtDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString();
}

export function leaseStateLabel(state: LeaseState): string {
  return LEASE_STATE_LABELS[state].replaceAll("_", " ");
}
