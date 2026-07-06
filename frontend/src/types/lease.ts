export const LeaseState = {
  CREATED: 0,
  ACTIVE: 1,
  PENDING_SETTLEMENT: 2,
  DISPUTED: 3,
  SETTLED: 4,
} as const;

export type LeaseState = (typeof LeaseState)[keyof typeof LeaseState];

export const LEASE_STATE_LABELS: Record<LeaseState, string> = {
  0: "CREATED",
  1: "ACTIVE",
  2: "PENDING_SETTLEMENT",
  3: "DISPUTED",
  4: "SETTLED",
};

export type LeaseView = {
  leaseId: bigint;
  landlord: string;
  tenant: string;
  depositAmount: bigint;
  leaseStartDate: bigint;
  leaseEndDate: bigint;
  yieldRate: bigint;
  state: LeaseState;
  proposedDamages: bigint;
  allocatedYield: bigint;
  tenantBalance: bigint;
  landlordBalance: bigint;
  propertyDetails: string;
};
