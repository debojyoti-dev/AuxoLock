// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AuxoLock - Rental Security Deposit Escrow with Simulated Yield
 * @author Your Name
 * @notice This contract manages rental deposits, calculates yield, and handles settlements
 * @dev Educational implementation - use caution in production
 */
contract AuxoLock {
    
    // ========== STATE VARIABLES ==========
    
    /// @notice Enum representing the lifecycle of a lease
    enum LeaseState {
        CREATED,           // Lease agreement created, waiting for deposit
        ACTIVE,            // Deposit locked, lease is ongoing
        PENDING_SETTLEMENT,// Lease ended, waiting for tenant to accept/dispute
        DISPUTED,          // Settlement disputed, waiting for arbiter
        SETTLED            // Final state, funds ready for withdrawal
    }
    
    /// @notice Struct containing all lease information
    struct Lease {
        uint256 leaseId;           // Unique identifier
        address landlord;          // Property owner
        address tenant;            // Renter
        uint256 depositAmount;     // Security deposit in wei
        uint256 leaseStartDate;    // Unix timestamp when lease begins
        uint256 leaseEndDate;      // Unix timestamp when lease ends
        uint256 yieldRate;         // Annual yield rate in basis points (500 = 5%)
        LeaseState state;          // Current state in lifecycle
        uint256 proposedDamages;   // Landlord's claimed damages
        uint256 allocatedYield;    // Frozen yield allocated at settlement proposal
        uint256 tenantBalance;     // Amount tenant can withdraw
        uint256 landlordBalance;   // Amount landlord can withdraw
        string propertyDetails;    // IPFS hash or property description
    }
    
    /// @notice Mapping from lease ID to Lease struct
    mapping(uint256 => Lease) public leases;
    
    /// @notice Counter for generating unique lease IDs
    uint256 public leaseCounter;
    
    /// @notice Address authorized to resolve disputes
    address public arbiter;

    /// @notice Total simulated-yield reserve funded into the contract
    uint256 public yieldReserveBalance;

    /// @notice Yield already committed to leases but not fully withdrawn yet
    uint256 public yieldReserveCommitted;
    
    /// @notice Constant for basis points calculation (100% = 10000)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Default annual yield rate (5% = 500 basis points)
    uint256 public constant DEFAULT_YIELD_RATE = 500;
    
    // ========== EVENTS ==========
    
    event LeaseCreated(
        uint256 indexed leaseId,
        address indexed landlord,
        address indexed tenant,
        uint256 depositAmount,
        uint256 leaseEndDate
    );
    
    event FundsDeposited(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount
    );
    
    event SettlementProposed(
        uint256 indexed leaseId,
        uint256 proposedDamages,
        uint256 tenantWouldReceive,
        uint256 landlordWouldReceive
    );
    
    event SettlementAccepted(
        uint256 indexed leaseId,
        uint256 tenantReceives,
        uint256 landlordReceives
    );
    
    event DisputeRaised(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 disputedDamages
    );
    
    event DisputeResolved(
        uint256 indexed leaseId,
        uint256 finalDamages,
        address indexed arbiter
    );
    
    event FundsWithdrawn(
        uint256 indexed leaseId,
        address indexed recipient,
        uint256 amount
    );

    event YieldReserveFunded(
        address indexed funder,
        uint256 amount,
        uint256 newReserveBalance
    );
    
    // ========== MODIFIERS ==========
    
    /// @notice Ensures caller is the landlord for this lease
    modifier onlyLandlord(uint256 _leaseId) {
        require(
            msg.sender == leases[_leaseId].landlord,
            "Only landlord can call this"
        );
        _;
    }
    
    /// @notice Ensures caller is the tenant for this lease
    modifier onlyTenant(uint256 _leaseId) {
        require(
            msg.sender == leases[_leaseId].tenant,
            "Only tenant can call this"
        );
        _;
    }
    
    /// @notice Ensures caller is the designated arbiter
    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can resolve disputes");
        _;
    }
    
    /// @notice Checks if lease is in expected state
    modifier inState(uint256 _leaseId, LeaseState _expectedState) {
        require(
            leases[_leaseId].state == _expectedState,
            "Invalid lease state for this action"
        );
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @notice Initializes the contract with an arbiter
     * @param _arbiter Address authorized to resolve disputes
     */
    constructor(address _arbiter) {
        require(_arbiter != address(0), "Invalid arbiter address");
        arbiter = _arbiter;
        leaseCounter = 0;
    }

    /**
     * @notice Funds the reserve that backs simulated yield payouts
     * @dev Keep this reserve separate in your mental model from tenant principal.
     */
    function fundYieldReserve() external payable onlyArbiter {
        require(msg.value > 0, "Funding amount must be greater than 0");
        yieldReserveBalance += msg.value;
        emit YieldReserveFunded(msg.sender, msg.value, yieldReserveBalance);
    }
    
    // ========== CORE FUNCTIONS ==========
    
    /**
     * @notice Creates a new lease agreement
     * @param _tenant Address of the renter
     * @param _depositAmount Security deposit amount in wei
     * @param _leaseDurationDays Duration of lease in days
     * @param _propertyDetails Description or IPFS hash of property
     * @return leaseId The unique identifier for this lease
     * 
     * @dev Only the landlord (msg.sender) can create a lease
     * @dev Lease starts immediately, ends after specified duration
     */
    function createLease(
        address _tenant,
        uint256 _depositAmount,
        uint256 _leaseDurationDays,
        string memory _propertyDetails
    ) external returns (uint256) {
        // Input validation
        require(_tenant != address(0), "Invalid tenant address");
        require(_tenant != msg.sender, "Landlord cannot be tenant");
        require(_depositAmount > 0, "Deposit must be greater than 0");
        require(_leaseDurationDays > 0, "Lease duration must be positive");
        
        // Increment lease counter for unique ID
        leaseCounter++;
        uint256 newLeaseId = leaseCounter;
        
        // Calculate lease end date
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + (_leaseDurationDays * 1 days);
        
        // Create new lease in storage
        Lease storage newLease = leases[newLeaseId];
        newLease.leaseId = newLeaseId;
        newLease.landlord = msg.sender;
        newLease.tenant = _tenant;
        newLease.depositAmount = _depositAmount;
        newLease.leaseStartDate = startDate;
        newLease.leaseEndDate = endDate;
        newLease.yieldRate = DEFAULT_YIELD_RATE; // 5% annual
        newLease.state = LeaseState.CREATED;
        newLease.propertyDetails = _propertyDetails;
        
        emit LeaseCreated(
            newLeaseId,
            msg.sender,
            _tenant,
            _depositAmount,
            endDate
        );
        
        return newLeaseId;
    }
    
    /**
     * @notice Tenant deposits funds to activate the lease
     * @param _leaseId The ID of the lease to fund
     * 
     * @dev Must send exact deposit amount specified in lease
     * @dev Transitions lease from CREATED to ACTIVE state
     */
    function depositFunds(uint256 _leaseId)
        external
        payable
        onlyTenant(_leaseId)
        inState(_leaseId, LeaseState.CREATED)
    {
        Lease storage lease = leases[_leaseId];
        
        // Verify exact deposit amount sent
        require(
            msg.value == lease.depositAmount,
            "Must send exact deposit amount"
        );
        
        // Activate the lease
        lease.state = LeaseState.ACTIVE;
        
        emit FundsDeposited(_leaseId, msg.sender, msg.value);
    }
    
    /**
     * @notice Landlord proposes settlement after lease ends
     * @param _leaseId The ID of the lease to settle
     * @param _damageAmount Amount to deduct for damages (in wei)
     * 
     * @dev Can only be called after lease end date
     * @dev Calculates yield and splits funds
     * @dev Transitions to PENDING_SETTLEMENT state
     */
    function proposeSettlement(uint256 _leaseId, uint256 _damageAmount)
        external
        onlyLandlord(_leaseId)
        inState(_leaseId, LeaseState.ACTIVE)
    {
        Lease storage lease = leases[_leaseId];
        
        // Ensure lease period has ended
        require(
            block.timestamp >= lease.leaseEndDate,
            "Lease has not ended yet"
        );
        
        // Validate damage amount doesn't exceed deposit
        require(
            _damageAmount <= lease.depositAmount,
            "Damages cannot exceed deposit"
        );
        
        _applySettlement(_leaseId, _damageAmount, true);
        
        // Update state
        lease.state = LeaseState.PENDING_SETTLEMENT;
        
        emit SettlementProposed(
            _leaseId,
            _damageAmount,
            lease.tenantBalance,
            lease.landlordBalance
        );
    }
    
    /**
     * @notice Tenant accepts landlord's settlement proposal
     * @param _leaseId The ID of the lease to accept
     * 
     * @dev Finalizes the settlement, allowing withdrawals
     */
    function acceptSettlement(uint256 _leaseId)
        external
        onlyTenant(_leaseId)
        inState(_leaseId, LeaseState.PENDING_SETTLEMENT)
    {
        Lease storage lease = leases[_leaseId];
        
        // Finalize settlement
        lease.state = LeaseState.SETTLED;
        
        emit SettlementAccepted(
            _leaseId,
            lease.tenantBalance,
            lease.landlordBalance
        );
    }
    
    /**
     * @notice Tenant disputes the proposed settlement
     * @param _leaseId The ID of the lease to dispute
     * 
     * @dev Freezes funds and requires arbiter intervention
     */
    function disputeSettlement(uint256 _leaseId)
        external
        onlyTenant(_leaseId)
        inState(_leaseId, LeaseState.PENDING_SETTLEMENT)
    {
        Lease storage lease = leases[_leaseId];
        
        // Move to disputed state (funds frozen)
        lease.state = LeaseState.DISPUTED;
        
        emit DisputeRaised(_leaseId, msg.sender, lease.proposedDamages);
    }
    
    /**
     * @notice Arbiter resolves a dispute by setting final damage amount
     * @param _leaseId The ID of the disputed lease
     * @param _finalDamageAmount Arbiter's determined damage amount
     * 
     * @dev Only arbiter can call this
     * @dev Recalculates balances and settles lease
     */
    function resolveDispute(uint256 _leaseId, uint256 _finalDamageAmount)
        external
        onlyArbiter
        inState(_leaseId, LeaseState.DISPUTED)
    {
        Lease storage lease = leases[_leaseId];
        
        // Validate damages
        require(
            _finalDamageAmount <= lease.depositAmount,
            "Damages cannot exceed deposit"
        );
        
        _applySettlement(_leaseId, _finalDamageAmount, false);
        
        // Settle the lease
        lease.state = LeaseState.SETTLED;
        
        emit DisputeResolved(_leaseId, _finalDamageAmount, msg.sender);
        emit SettlementAccepted(_leaseId, lease.tenantBalance, lease.landlordBalance);
    }
    
    /**
     * @notice Withdraw your allocated funds after settlement
     * @param _leaseId The ID of the settled lease
     * 
     * @dev Uses withdrawal pattern (pull not push) for security
     * @dev Prevents reentrancy by zeroing balance before transfer
     */
    function withdraw(uint256 _leaseId) external inState(_leaseId, LeaseState.SETTLED) {
        Lease storage lease = leases[_leaseId];
        
        uint256 amount = 0;
        
        // Determine who is withdrawing and their balance
        if (msg.sender == lease.tenant) {
            amount = lease.tenantBalance;
            lease.tenantBalance = 0; // Prevent reentrancy
        } else if (msg.sender == lease.landlord) {
            amount = lease.landlordBalance;
            lease.landlordBalance = 0; // Prevent reentrancy
        } else {
            revert("Not a party to this lease");
        }
        
        require(amount > 0, "No funds to withdraw");
        
        // Transfer funds (checks-effects-interactions pattern)
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        // Once a lease is fully paid out, release its committed yield accounting.
        if (lease.tenantBalance == 0 && lease.landlordBalance == 0 && lease.allocatedYield > 0) {
            yieldReserveCommitted -= lease.allocatedYield;
            lease.allocatedYield = 0;
        }
        
        emit FundsWithdrawn(_leaseId, msg.sender, amount);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Calculates simulated yield for a lease
     * @param _leaseId The ID of the lease
     * @return yield The calculated yield in wei
     * 
     * @dev Formula: (depositAmount × yieldRate × durationInDays) / (365 × BASIS_POINTS)
     * @dev Example: 1000 AVAX × 500 bps × 365 days / (365 × 10000) = 50 AVAX (5%)
     */
    function calculateYield(uint256 _leaseId) public view returns (uint256) {
        Lease storage lease = leases[_leaseId];
        
        // Calculate lease duration in days
        uint256 durationInDays = (lease.leaseEndDate - lease.leaseStartDate) / 1 days;
        
        // Simulated yield formula
        uint256 yield = (lease.depositAmount * lease.yieldRate * durationInDays) 
                        / (365 * BASIS_POINTS);
        
        return yield;
    }

    /**
     * @notice Returns remaining yield reserve that can still be promised to new settlements
     */
    function getAvailableYieldReserve() public view returns (uint256) {
        return yieldReserveBalance - yieldReserveCommitted;
    }

    /**
     * @notice Returns the yield that is safe to promise for a lease right now
     * @dev This caps projected yield by currently available reserve.
     */
    function getSafeYield(uint256 _leaseId) public view returns (uint256) {
        uint256 projectedYield = calculateYield(_leaseId);
        uint256 availableReserve = getAvailableYieldReserve();
        if (projectedYield > availableReserve) {
            return availableReserve;
        }
        return projectedYield;
    }
    
    /**
     * @notice Get complete details of a lease
     * @param _leaseId The ID of the lease
     * @return Complete Lease struct
     */
    function getLeaseDetails(uint256 _leaseId) external view returns (Lease memory) {
        return leases[_leaseId];
    }
    
    /**
     * @notice Get contract balance for a specific lease
     * @param _leaseId The ID of the lease
     * @return Total claimable target (deposit + safely backed yield)
     */
    function getLeaseBalance(uint256 _leaseId) external view returns (uint256) {
        Lease storage lease = leases[_leaseId];
        return lease.depositAmount + getSafeYield(_leaseId);
    }
    
    /**
     * @notice Get all leases for a specific address
     * @param _user Address to query (landlord or tenant)
     * @return Array of lease IDs where user is involved
     */
    function getUserLeases(address _user) external view returns (uint256[] memory) {
        // Count user's leases first
        uint256 count = 0;
        for (uint256 i = 1; i <= leaseCounter; i++) {
            if (leases[i].landlord == _user || leases[i].tenant == _user) {
                count++;
            }
        }
        
        // Create array and populate
        uint256[] memory userLeases = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= leaseCounter; i++) {
            if (leases[i].landlord == _user || leases[i].tenant == _user) {
                userLeases[index] = i;
                index++;
            }
        }
        
        return userLeases;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Update the arbiter address
     * @param _newArbiter New arbiter address
     * @dev Only current arbiter can update (or implement Ownable pattern)
     */
    function updateArbiter(address _newArbiter) external onlyArbiter {
        require(_newArbiter != address(0), "Invalid arbiter address");
        arbiter = _newArbiter;
    }

    /**
     * @dev Internal settlement calculator that preserves principal and safely allocates yield.
     * Principal invariant: tenantPrincipal + landlordPrincipal = depositAmount.
     */
    function _applySettlement(uint256 _leaseId, uint256 _damageAmount, bool allocateNewYield) internal {
        Lease storage lease = leases[_leaseId];

        uint256 totalYield;
        if (allocateNewYield) {
            totalYield = getSafeYield(_leaseId);
            lease.allocatedYield = totalYield;
            yieldReserveCommitted += totalYield;
        } else {
            // During dispute resolution, do not recalculate yield; keep it frozen.
            totalYield = lease.allocatedYield;
        }

        uint256 tenantPrincipal = lease.depositAmount - _damageAmount;
        uint256 landlordPrincipal = _damageAmount;

        // Principal must remain fully allocated between tenant and landlord.
        require(
            tenantPrincipal + landlordPrincipal == lease.depositAmount,
            "Principal accounting mismatch"
        );

        uint256 tenantYield = totalYield / 2;
        uint256 landlordYield = totalYield - tenantYield;

        lease.tenantBalance = tenantPrincipal + tenantYield;
        lease.landlordBalance = landlordPrincipal + landlordYield;
        lease.proposedDamages = _damageAmount;
    }
}
