import { isAddress } from "ethers";
import type { FormEvent } from "react";
import { useState } from "react";
import { createLease } from "../web3/auxoLock";
import { useWallet } from "../web3/wallet";

export function CreateLeasePage() {
  const { provider } = useWallet();
  const [tenant, setTenant] = useState("");
  const [deposit, setDeposit] = useState("1");
  const [days, setDays] = useState(365);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!provider) {
      setError("Connect wallet first.");
      return;
    }

    // Validate tenant address
    if (!tenant || !isAddress(tenant)) {
      setError("Invalid tenant address. Please enter a valid Ethereum address (0x...)");
      return;
    }

    // Validate deposit
    if (!deposit || Number(deposit) <= 0) {
      setError("Deposit must be greater than 0 AVAX");
      return;
    }

    // Validate duration
    if (days <= 0) {
      setError("Lease duration must be at least 1 day");
      return;
    }

    try {
      setStatus("Sending transaction...");
      const receipt = await createLease(provider, tenant, deposit, days, details);
      setStatus(`✅ Lease created successfully! Tx: ${receipt?.hash}`);
      
      // Reset form
      setTenant("");
      setDeposit("1");
      setDays(365);
      setDetails("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Create Lease</h1>
      <p className="text-slate-700">Landlord defines tenant, deposit size, duration, and property metadata.</p>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl bg-white/80 p-6 shadow-lg">
        <div>
          <label className="text-sm font-semibold text-slate-700">Tenant Address</label>
          <input
            className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm ${
              tenant && !isAddress(tenant) ? "border-red-400 bg-red-50" : "border-slate-300"
            }`}
            placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          {tenant && !isAddress(tenant) && (
            <p className="mt-1 text-xs text-red-600">⚠️ Invalid address format</p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Deposit (AVAX)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="1.0"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Lease Duration (days)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            type="number"
            min="1"
            placeholder="365"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Property Details</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            placeholder="123 Main St, Apartment 4B"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-teal-800 px-4 py-3 font-bold text-white transition hover:bg-teal-700"
        >
          Create Lease
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          ❌ {error}
        </div>
      )}

      {status && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          {status}
        </div>
      )}
    </section>
  );
}
