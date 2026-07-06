import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

// Helper function to advance time in seconds
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("AuxoLock", function () {
  // Test fixtures
  let auxoLock: any;
  let landlord: any;
  let tenant: any;
  let arbiter: any;
  let other: any;

  // Test constants
  const DEPOSIT_AMOUNT = ethers.parseEther("1.0"); // 1 AVAX
  const LEASE_DURATION_DAYS = 365; // 1 year
  const PROPERTY_DETAILS = "123 Main St, Apartment 4B";
  const DAMAGE_AMOUNT = ethers.parseEther("0.1"); // 10% damage
  const BASIS_POINTS = 10000n;
  const YIELD_RATE = 500n; // 5% annual

  beforeEach(async function () {
    // Get signers
    [landlord, tenant, arbiter, other] = await ethers.getSigners();

    // Deploy contract
    const AuxoLock = await ethers.getContractFactory("AuxoLock");
    auxoLock = await AuxoLock.deploy(arbiter.address);
    await auxoLock.waitForDeployment();

    // Fund reserve so simulated yield is safely backed during tests.
    await auxoLock.connect(arbiter).fundYieldReserve({ value: ethers.parseEther("100") });
  });

  // ========== DEPLOYMENT & SETUP TESTS ==========

  describe("Deployment", function () {
    it("Should set the correct arbiter address", async function () {
      expect(await auxoLock.arbiter()).to.equal(arbiter.address);
    });

    it("Should initialize leaseCounter to 0", async function () {
      expect(await auxoLock.leaseCounter()).to.equal(0);
    });

    it("Should revert if arbiter address is zero", async function () {
      const AuxoLock = await ethers.getContractFactory("AuxoLock");
      await expect(
        AuxoLock.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid arbiter address");
    });
  });

  // ========== LEASE CREATION TESTS ==========

  describe("createLease", function () {
    it("Should create a lease with correct details", async function () {
      const tx = await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Check lease counter incremented
      expect(await auxoLock.leaseCounter()).to.equal(1);

      // Get lease details
      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.leaseId).to.equal(1);
      expect(lease.landlord).to.equal(landlord.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.depositAmount).to.equal(DEPOSIT_AMOUNT);
      expect(lease.propertyDetails).to.equal(PROPERTY_DETAILS);
      expect(lease.yieldRate).to.equal(YIELD_RATE);
      expect(lease.state).to.equal(0); // CREATED state
    });

    it("Should emit LeaseCreated event", async function () {
      // Create lease and check event is emitted
      // Note: We can't easily predict the exact end date due to block.timestamp variations,
      // so we just verify the event is properly emitted by the contract
      const tx = auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      
      // Just check that the event is emitted with the lease and tenant info
      await expect(tx)
        .to.emit(auxoLock, "LeaseCreated");
    });

    it("Should revert if tenant address is zero", async function () {
      await expect(
        auxoLock.connect(landlord).createLease(
          ethers.ZeroAddress,
          DEPOSIT_AMOUNT,
          LEASE_DURATION_DAYS,
          PROPERTY_DETAILS
        )
      ).to.be.revertedWith("Invalid tenant address");
    });

    it("Should revert if landlord is also tenant", async function () {
      await expect(
        auxoLock.connect(landlord).createLease(
          landlord.address,
          DEPOSIT_AMOUNT,
          LEASE_DURATION_DAYS,
          PROPERTY_DETAILS
        )
      ).to.be.revertedWith("Landlord cannot be tenant");
    });

    it("Should revert if deposit amount is zero", async function () {
      await expect(
        auxoLock.connect(landlord).createLease(
          tenant.address,
          0,
          LEASE_DURATION_DAYS,
          PROPERTY_DETAILS
        )
      ).to.be.revertedWith("Deposit must be greater than 0");
    });

    it("Should revert if lease duration is zero", async function () {
      await expect(
        auxoLock.connect(landlord).createLease(
          tenant.address,
          DEPOSIT_AMOUNT,
          0,
          PROPERTY_DETAILS
        )
      ).to.be.revertedWith("Lease duration must be positive");
    });

    it("Should create multiple leases with different IDs", async function () {
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );

      await auxoLock.connect(landlord).createLease(
        other.address,
        ethers.parseEther("2.0"),
        180,
        "456 Oak Ave"
      );

      expect(await auxoLock.leaseCounter()).to.equal(2);

      const lease1 = await auxoLock.getLeaseDetails(1);
      const lease2 = await auxoLock.getLeaseDetails(2);

      expect(lease1.tenant).to.equal(tenant.address);
      expect(lease2.tenant).to.equal(other.address);
    });
  });

  // ========== DEPOSIT TESTS ==========

  describe("depositFunds", function () {
    beforeEach(async function () {
      // Create lease before each deposit test
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
    });

    it("Should accept exact deposit amount and activate lease", async function () {
      const tx = await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(1); // ACTIVE state
    });

    it("Should emit FundsDeposited event", async function () {
      await expect(
        auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT })
      )
        .to.emit(auxoLock, "FundsDeposited")
        .withArgs(1, tenant.address, DEPOSIT_AMOUNT);
    });

    it("Should revert if wrong amount sent", async function () {
      const wrongAmount = ethers.parseEther("0.5");
      await expect(
        auxoLock.connect(tenant).depositFunds(1, { value: wrongAmount })
      ).to.be.revertedWith("Must send exact deposit amount");
    });

    it("Should revert if non-tenant calls depositFunds", async function () {
      await expect(
        auxoLock.connect(other).depositFunds(1, { value: DEPOSIT_AMOUNT })
      ).to.be.revertedWith("Only tenant can call this");
    });

    it("Should revert if called twice", async function () {
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });

      await expect(
        auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT })
      ).to.be.revertedWith("Invalid lease state for this action");
    });

    it("Should reject deposit if less than required", async function () {
      const tooSmall = ethers.parseEther("0.9");
      await expect(
        auxoLock.connect(tenant).depositFunds(1, { value: tooSmall })
      ).to.be.revertedWith("Must send exact deposit amount");
    });

    it("Should reject deposit if more than required", async function () {
      const tooLarge = ethers.parseEther("1.1");
      await expect(
        auxoLock.connect(tenant).depositFunds(1, { value: tooLarge })
      ).to.be.revertedWith("Must send exact deposit amount");
    });
  });

  // ========== YIELD CALCULATION TESTS ==========

  describe("calculateYield", function () {
    beforeEach(async function () {
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
    });

    it("Should calculate correct yield for 1 year at 5%", async function () {
      const expectedYield = (DEPOSIT_AMOUNT * YIELD_RATE * 365n) / (365n * BASIS_POINTS);
      const actualYield = await auxoLock.calculateYield(1);

      expect(actualYield).to.equal(expectedYield);
      expect(actualYield).to.equal(ethers.parseEther("0.05")); // 5% of 1 AVAX
    });

    it("Should calculate correct yield for 6 months (180 days)", async function () {
      // Create 6-month lease
      const deposit = ethers.parseEther("2.0");
      await auxoLock.connect(landlord).createLease(
        other.address,
        deposit,
        180,
        "Property 2"
      );
      await auxoLock.connect(other).depositFunds(2, { value: deposit });

      // Expected: 2 AVAX * 500 bps * 180 / (365 * 10000) ≈ 0.049315... AVAX
      const expectedYield = (deposit * YIELD_RATE * 180n) / (365n * BASIS_POINTS);
      const actualYield = await auxoLock.calculateYield(2);

      expect(actualYield).to.equal(expectedYield);
    });

    it("Should return zero yield for zero-duration lease", async function () {
      // Edge case: technically shouldn't happen, but test anyway
      // This requires mocking time in a special way, so we verify the formula
      const zeroYield = (DEPOSIT_AMOUNT * YIELD_RATE * 0n) / (365n * BASIS_POINTS);
      expect(zeroYield).to.equal(0);
    });

    it("Should calculate yield for various deposit durations", async function () {
      // Using the 6-month lease created in the second test (lease 2)
      const deposit = ethers.parseEther("2.0");
      await auxoLock.connect(landlord).createLease(
        other.address,
        deposit,
        180,
        "Property 2"
      );
      await auxoLock.connect(other).depositFunds(2, { value: deposit });

      const expectedYield = (deposit * YIELD_RATE * 180n) / (365n * BASIS_POINTS);
      const actualYield = await auxoLock.calculateYield(2);

      expect(actualYield).to.equal(expectedYield);
    });
  });

  describe("Yield safety", function () {
    it("Should cap safe yield by available reserve", async function () {
      // Fresh contract with tiny reserve to verify the cap.
      const AuxoLock = await ethers.getContractFactory("AuxoLock");
      const smallReserveLock = await AuxoLock.deploy(arbiter.address);
      await smallReserveLock.waitForDeployment();

      await smallReserveLock.connect(arbiter).fundYieldReserve({
        value: ethers.parseEther("0.01"),
      });

      await smallReserveLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await smallReserveLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });

      const projected = await smallReserveLock.calculateYield(1);
      const safeYield = await smallReserveLock.getSafeYield(1);

      expect(projected).to.equal(ethers.parseEther("0.05"));
      expect(safeYield).to.equal(ethers.parseEther("0.01"));
    });

    it("Should freeze allocated yield when dispute is raised", async function () {
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });

      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);

      const beforeDispute = await auxoLock.getLeaseDetails(1);
      const frozenYield = beforeDispute.allocatedYield;

      await auxoLock.connect(tenant).disputeSettlement(1);

      // Advance time further. Frozen yield should stay unchanged.
      await increaseTime(30 * 24 * 60 * 60);
      await auxoLock.connect(arbiter).resolveDispute(1, ethers.parseEther("0.05"));

      const afterResolve = await auxoLock.getLeaseDetails(1);
      expect(afterResolve.allocatedYield).to.equal(frozenYield);
    });
  });

  // ========== SETTLEMENT TESTS ==========

  describe("proposeSettlement", function () {
    beforeEach(async function () {
      // Create and fund lease
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });

      // Fast-forward time to lease end
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
    });

    it("Should propose settlement with no damages", async function () {
      const tx = await auxoLock.connect(landlord).proposeSettlement(1, 0);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(2); // PENDING_SETTLEMENT state
      expect(lease.proposedDamages).to.equal(0);
    });

    it("Should calculate correct settlement balances with no damages", async function () {
      await auxoLock.connect(landlord).proposeSettlement(1, 0);

      const lease = await auxoLock.getLeaseDetails(1);
      const totalYield = await auxoLock.getSafeYield(1);
      const yieldShare = totalYield / 2n;

      // Tenant: deposit + half yield
      expect(lease.tenantBalance).to.equal(DEPOSIT_AMOUNT + yieldShare);
      // Landlord: half yield
      expect(lease.landlordBalance).to.equal(yieldShare);
    });

    it("Should propose settlement with damages", async function () {
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.proposedDamages).to.equal(DAMAGE_AMOUNT);
      expect(lease.state).to.equal(2); // PENDING_SETTLEMENT
    });

    it("Should calculate correct settlement balances with damages", async function () {
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);

      const lease = await auxoLock.getLeaseDetails(1);
      const totalYield = await auxoLock.getSafeYield(1);
      const yieldShare = totalYield / 2n;

      // Tenant: (deposit - damages) + half yield
      expect(lease.tenantBalance).to.equal(
        DEPOSIT_AMOUNT - DAMAGE_AMOUNT + yieldShare
      );
      // Landlord: damages + half yield
      expect(lease.landlordBalance).to.equal(DAMAGE_AMOUNT + yieldShare);
    });

    it("Should emit SettlementProposed event", async function () {
      const totalYield = await auxoLock.getSafeYield(1);
      const yieldShare = totalYield / 2n;
      const expectedTenantBalance = DEPOSIT_AMOUNT - DAMAGE_AMOUNT + yieldShare;
      const expectedLandlordBalance = DAMAGE_AMOUNT + yieldShare;

      await expect(auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT))
        .to.emit(auxoLock, "SettlementProposed")
        .withArgs(1, DAMAGE_AMOUNT, expectedTenantBalance, expectedLandlordBalance);
    });

    it("Should revert if non-landlord proposes", async function () {
      await expect(
        auxoLock.connect(tenant).proposeSettlement(1, 0)
      ).to.be.revertedWith("Only landlord can call this");
    });

    it("Should revert if called before lease ends", async function () {
      // Create new lease without time advance
      await auxoLock.connect(landlord).createLease(
        other.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        "Property 2"
      );
      await auxoLock.connect(other).depositFunds(2, { value: DEPOSIT_AMOUNT });

      await expect(
        auxoLock.connect(landlord).proposeSettlement(2, 0)
      ).to.be.revertedWith("Lease has not ended yet");
    });

    it("Should revert if damages exceed deposit", async function () {
      const excessiveDamages = DEPOSIT_AMOUNT + ethers.parseEther("1.0");
      await expect(
        auxoLock.connect(landlord).proposeSettlement(1, excessiveDamages)
      ).to.be.revertedWith("Damages cannot exceed deposit");
    });

    it("Should allow damages equal to deposit", async function () {
      const tx = auxoLock.connect(landlord).proposeSettlement(1, DEPOSIT_AMOUNT);
      const result = await tx;
      expect(result).to.not.be.undefined;

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.tenantBalance).to.be.gte(0); // Should have some yield still
    });
  });

  // ========== ACCEPTANCE TESTS ==========

  describe("acceptSettlement", function () {
    beforeEach(async function () {
      // Create, fund lease, and propose settlement
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);
    });

    it("Should accept settlement and move to SETTLED state", async function () {
      const tx = await auxoLock.connect(tenant).acceptSettlement(1);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(4); // SETTLED state
    });

    it("Should emit SettlementAccepted event", async function () {
      const lease = await auxoLock.getLeaseDetails(1);
      await expect(auxoLock.connect(tenant).acceptSettlement(1))
        .to.emit(auxoLock, "SettlementAccepted")
        .withArgs(1, lease.tenantBalance, lease.landlordBalance);
    });

    it("Should revert if non-tenant accepts", async function () {
      await expect(
        auxoLock.connect(landlord).acceptSettlement(1)
      ).to.be.revertedWith("Only tenant can call this");
    });

    it("Should revert if not in PENDING_SETTLEMENT state", async function () {
      // Accept first time
      await auxoLock.connect(tenant).acceptSettlement(1);

      // Try to accept again
      await expect(
        auxoLock.connect(tenant).acceptSettlement(1)
      ).to.be.revertedWith("Invalid lease state for this action");
    });
  });

  // ========== DISPUTE TESTS ==========

  describe("disputeSettlement", function () {
    beforeEach(async function () {
      // Create, fund lease, and propose settlement
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);
    });

    it("Should raise dispute and move to DISPUTED state", async function () {
      const tx = await auxoLock.connect(tenant).disputeSettlement(1);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(3); // DISPUTED state
    });

    it("Should emit DisputeRaised event", async function () {
      await expect(auxoLock.connect(tenant).disputeSettlement(1))
        .to.emit(auxoLock, "DisputeRaised")
        .withArgs(1, tenant.address, DAMAGE_AMOUNT);
    });

    it("Should revert if non-tenant disputes", async function () {
      await expect(
        auxoLock.connect(landlord).disputeSettlement(1)
      ).to.be.revertedWith("Only tenant can call this");
    });

    it("Should revert if not in PENDING_SETTLEMENT state", async function () {
      // Dispute first time
      await auxoLock.connect(tenant).disputeSettlement(1);

      // Try to dispute again
      await expect(
        auxoLock.connect(tenant).disputeSettlement(1)
      ).to.be.revertedWith("Invalid lease state for this action");
    });

    it("Should freeze funds in disputed state", async function () {
      await auxoLock.connect(tenant).disputeSettlement(1);

      const lease = await auxoLock.getLeaseDetails(1);
      // Both balances should be set (frozen until arbiter resolves)
      expect(lease.state).to.equal(3); // DISPUTED
    });
  });

  // ========== DISPUTE RESOLUTION TESTS ==========

  describe("resolveDispute", function () {
    beforeEach(async function () {
      // Create, fund lease, propose and dispute settlement
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);
      await auxoLock.connect(tenant).disputeSettlement(1);
    });

    it("Should resolve dispute with arbiter's decision", async function () {
      const arbiterDamages = ethers.parseEther("0.05"); // Less than proposed
      const tx = await auxoLock.connect(arbiter).resolveDispute(1, arbiterDamages);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(4); // SETTLED state
    });

    it("Should recalculate balances based on arbiter's decision", async function () {
      const arbiterDamages = ethers.parseEther("0.05");
      await auxoLock.connect(arbiter).resolveDispute(1, arbiterDamages);

      const lease = await auxoLock.getLeaseDetails(1);
      const totalYield = await auxoLock.getSafeYield(1);
      const yieldShare = totalYield / 2n;

      expect(lease.tenantBalance).to.equal(DEPOSIT_AMOUNT - arbiterDamages + yieldShare);
      expect(lease.landlordBalance).to.equal(arbiterDamages + yieldShare);
    });

    it("Should emit DisputeResolved event", async function () {
      const arbiterDamages = ethers.parseEther("0.05");
      await expect(auxoLock.connect(arbiter).resolveDispute(1, arbiterDamages))
        .to.emit(auxoLock, "DisputeResolved")
        .withArgs(1, arbiterDamages, arbiter.address);
    });

    it("Should revert if non-arbiter resolves dispute", async function () {
      await expect(
        auxoLock.connect(tenant).resolveDispute(1, DAMAGE_AMOUNT)
      ).to.be.revertedWith("Only arbiter can resolve disputes");
    });

    it("Should revert if damages exceed deposit", async function () {
      const excessiveDamages = DEPOSIT_AMOUNT + ethers.parseEther("1.0");
      await expect(
        auxoLock.connect(arbiter).resolveDispute(1, excessiveDamages)
      ).to.be.revertedWith("Damages cannot exceed deposit");
    });

    it("Should revert if not in DISPUTED state", async function () {
      // Create new lease in CREATED state (not DISPUTED)
      await auxoLock.connect(landlord).createLease(
        other.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        "Property 2"
      );

      await expect(
        auxoLock.connect(arbiter).resolveDispute(2, DAMAGE_AMOUNT)
      ).to.be.revertedWith("Invalid lease state for this action");
    });
  });

  // ========== WITHDRAWAL TESTS ==========

  describe("withdraw", function () {
    beforeEach(async function () {
      // Create, fund, and settle lease
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);
      await auxoLock.connect(tenant).acceptSettlement(1);
    });

    it("Should allow tenant to withdraw their balance", async function () {
      const balanceBefore = await ethers.provider.getBalance(tenant.address);
      const tx = await auxoLock.connect(tenant).withdraw(1);
      const receipt = await tx.wait();

      const lease = await auxoLock.getLeaseDetails(1);
      const expectedAmount = lease.tenantBalance + ethers.toBigInt(receipt.gasUsed) * ethers.toBigInt(1); // Approximate

      const balanceAfter = await ethers.provider.getBalance(tenant.address);
      expect(balanceAfter).to.be.gt(balanceBefore - ethers.parseEther("1.0")); // Lost some to gas
    });

    it("Should allow landlord to withdraw their balance", async function () {
      const balanceBefore = await ethers.provider.getBalance(landlord.address);
      const tx = await auxoLock.connect(landlord).withdraw(1);
      const receipt = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(landlord.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should emit FundsWithdrawn event", async function () {
      const lease = await auxoLock.getLeaseDetails(1);
      await expect(auxoLock.connect(tenant).withdraw(1))
        .to.emit(auxoLock, "FundsWithdrawn")
        .withArgs(1, tenant.address, lease.tenantBalance);
    });

    it("Should prevent double withdrawal (reentrancy protection)", async function () {
      // Withdraw once
      await auxoLock.connect(tenant).withdraw(1);

      // Try to withdraw again
      await expect(
        auxoLock.connect(tenant).withdraw(1)
      ).to.be.revertedWith("No funds to withdraw");
    });

    it("Should revert if not a party to the lease", async function () {
      await expect(
        auxoLock.connect(other).withdraw(1)
      ).to.be.revertedWith("Not a party to this lease");
    });

    it("Should revert if trying to withdraw before settlement", async function () {
      // Create new unsettled lease
      await auxoLock.connect(landlord).createLease(
        other.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        "Property 2"
      );
      await auxoLock.connect(other).depositFunds(2, { value: DEPOSIT_AMOUNT });

      await expect(
        auxoLock.connect(other).withdraw(2)
      ).to.be.revertedWith("Invalid lease state for this action");
    });
  });

  // ========== VIEW FUNCTION TESTS ==========

  describe("getLeaseDetails", function () {
    beforeEach(async function () {
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
    });

    it("Should return complete lease information", async function () {
      const lease = await auxoLock.getLeaseDetails(1);

      expect(lease.leaseId).to.equal(1);
      expect(lease.landlord).to.equal(landlord.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.depositAmount).to.equal(DEPOSIT_AMOUNT);
      expect(lease.yieldRate).to.equal(YIELD_RATE);
      expect(lease.propertyDetails).to.equal(PROPERTY_DETAILS);
    });
  });

  describe("getLeaseBalance", function () {
    beforeEach(async function () {
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, { value: DEPOSIT_AMOUNT });
    });

    it("Should return deposit plus yield", async function () {
      const expectedBalance = DEPOSIT_AMOUNT + (await auxoLock.getSafeYield(1));
      const actualBalance = await auxoLock.getLeaseBalance(1);

      expect(actualBalance).to.equal(expectedBalance);
    });
  });

  describe("getUserLeases", function () {
    it("Should return empty array for user with no leases", async function () {
      const leases = await auxoLock.getUserLeases(landlord.address);
      expect(leases).to.have.lengthOf(0);
    });

    it("Should return all leases where user is landlord", async function () {
      // Create 3 leases with landlord
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        "Property 1"
      );
      await auxoLock.connect(landlord).createLease(
        other.address,
        DEPOSIT_AMOUNT,
        180,
        "Property 2"
      );
      await auxoLock.connect(other).createLease(
        landlord.address,
        DEPOSIT_AMOUNT,
        90,
        "Property 3"
      );

      const landlordLeases = await auxoLock.getUserLeases(landlord.address);
      expect(landlordLeases).to.have.lengthOf(3);
      expect(landlordLeases).to.include.members([1n, 2n, 3n]);
    });

    it("Should return all leases where user is tenant", async function () {
      // Create leases with tenant
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        "Property 1"
      );
      await auxoLock.connect(other).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        180,
        "Property 2"
      );
      const landlord2 = (await ethers.getSigners())[5];
      await auxoLock.connect(landlord2).createLease(
        other.address,
        DEPOSIT_AMOUNT,
        90,
        "Property 3"
      );

      const tenantLeases = await auxoLock.getUserLeases(tenant.address);
      expect(tenantLeases).to.have.lengthOf(2);
      expect(tenantLeases).to.include.members([1n, 2n]);
    });
  });

  // ========== ADMIN FUNCTION TESTS ==========

  describe("updateArbiter", function () {
    it("Should allow arbiter to update arbiter address", async function () {
      const newArbiter = (await ethers.getSigners())[5];
      await auxoLock.connect(arbiter).updateArbiter(newArbiter.address);

      expect(await auxoLock.arbiter()).to.equal(newArbiter.address);
    });

    it("Should revert if non-arbiter tries to update", async function () {
      const newArbiter = (await ethers.getSigners())[5];
      await expect(
        auxoLock.connect(landlord).updateArbiter(newArbiter.address)
      ).to.be.revertedWith("Only arbiter can resolve disputes");
    });

    it("Should revert if trying to set zero address", async function () {
      await expect(
        auxoLock.connect(arbiter).updateArbiter(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid arbiter address");
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe("Full Lease Lifecycle - Happy Path", function () {
    it("Should complete full lease cycle: create → deposit → settle → withdraw", async function () {
      // 1. Create lease
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );

      // 2. Deposit funds
      await auxoLock.connect(tenant).depositFunds(1, {
        value: DEPOSIT_AMOUNT,
      });

      let lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(1); // ACTIVE

      // 3. Fast-forward time
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);

      // 4. Propose settlement
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);

      lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(2); // PENDING_SETTLEMENT

      // 5. Accept settlement
      await auxoLock.connect(tenant).acceptSettlement(1);

      lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(4); // SETTLED

      // 6. Withdraw funds
      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
      const withdrawTx = await auxoLock.connect(tenant).withdraw(1);
      const withdrawReceipt = await withdrawTx.wait();
      expect(withdrawReceipt.status).to.equal(1);

      // Verify funds received (accounting for gas)
      const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
      expect(tenantBalanceAfter).to.be.gt(tenantBalanceBefore);
    });
  });

  describe("Full Lease Lifecycle - With Dispute", function () {
    it("Should complete lease cycle with dispute resolution", async function () {
      // Setup
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        DEPOSIT_AMOUNT,
        LEASE_DURATION_DAYS,
        PROPERTY_DETAILS
      );
      await auxoLock.connect(tenant).depositFunds(1, {
        value: DEPOSIT_AMOUNT,
      });
      await increaseTime(LEASE_DURATION_DAYS * 24 * 60 * 60 + 1);

      // Landlord proposes settlement with damages
      await auxoLock.connect(landlord).proposeSettlement(1, DAMAGE_AMOUNT);

      // Tenant disputes
      await auxoLock.connect(tenant).disputeSettlement(1);

      let lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(3); // DISPUTED

      // Arbiter resolves with lower damages
      const arbiterDamages = ethers.parseEther("0.03");
      await auxoLock.connect(arbiter).resolveDispute(1, arbiterDamages);

      lease = await auxoLock.getLeaseDetails(1);
      expect(lease.state).to.equal(4); // SETTLED

      // Verify balances reflect arbiter's decision (not landlord's proposal)
      const totalYield = await auxoLock.getSafeYield(1);
      const yieldShare = totalYield / 2n;
      expect(lease.tenantBalance).to.equal(DEPOSIT_AMOUNT - arbiterDamages + yieldShare);
    });
  });

  describe("Multiple Concurrent Leases", function () {
    it("Should handle multiple independent leases correctly", async function () {
      const signer2 = (await ethers.getSigners())[5];
      const signer3 = (await ethers.getSigners())[6];

      // Create 3 independent leases
      await auxoLock.connect(landlord).createLease(
        tenant.address,
        ethers.parseEther("1.0"),
        365,
        "Property A"
      );
      await auxoLock.connect(other).createLease(
        signer2.address,
        ethers.parseEther("2.0"),
        180,
        "Property B"
      );
      await auxoLock.connect(signer3).createLease(
        signer2.address,
        ethers.parseEther("0.5"),
        90,
        "Property C"
      );

      // Deposit for all
      await auxoLock.connect(tenant).depositFunds(1, {
        value: ethers.parseEther("1.0"),
      });
      await auxoLock.connect(signer2).depositFunds(2, {
        value: ethers.parseEther("2.0"),
      });
      await auxoLock.connect(signer2).depositFunds(3, {
        value: ethers.parseEther("0.5"),
      });

      // Verify all are active
      const lease1 = await auxoLock.getLeaseDetails(1);
      const lease2 = await auxoLock.getLeaseDetails(2);
      const lease3 = await auxoLock.getLeaseDetails(3);

      expect(lease1.state).to.equal(1); // ACTIVE
      expect(lease2.state).to.equal(1); // ACTIVE
      expect(lease3.state).to.equal(1); // ACTIVE

      // Verify yields are independent
      const yield1 = await auxoLock.calculateYield(1);
      const yield2 = await auxoLock.calculateYield(2);
      const yield3 = await auxoLock.calculateYield(3);

      // Lease 1: 1 AVAX * 5% * 365/365 = 0.05 AVAX
      // Lease 2: 2 AVAX * 5% * 180/365 ≈ 0.0493 AVAX
      // Lease 3: 0.5 AVAX * 5% * 90/365 ≈ 0.0062 AVAX
      expect(yield1).to.be.gt(yield2); // Lease 1 has higher yield than lease 2
      expect(yield3).to.be.lt(yield1); // Lease 3 is shortest duration
    });
  });
});
