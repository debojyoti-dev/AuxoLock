export const auxoLockAbi = [
  "function createLease(address _tenant,uint256 _depositAmount,uint256 _leaseDurationDays,string _propertyDetails) returns (uint256)",
  "function depositFunds(uint256 _leaseId) payable",
  "function proposeSettlement(uint256 _leaseId,uint256 _damageAmount)",
  "function acceptSettlement(uint256 _leaseId)",
  "function disputeSettlement(uint256 _leaseId)",
  "function resolveDispute(uint256 _leaseId,uint256 _finalDamageAmount)",
  "function getLeaseDetails(uint256 _leaseId) view returns (tuple(uint256 leaseId,address landlord,address tenant,uint256 depositAmount,uint256 leaseStartDate,uint256 leaseEndDate,uint256 yieldRate,uint8 state,uint256 proposedDamages,uint256 allocatedYield,uint256 tenantBalance,uint256 landlordBalance,string propertyDetails))",
  "function getUserLeases(address _user) view returns (uint256[])",
  "function calculateYield(uint256 _leaseId) view returns (uint256)",
  "function getSafeYield(uint256 _leaseId) view returns (uint256)",
  "function getAvailableYieldReserve() view returns (uint256)",
] as const;
