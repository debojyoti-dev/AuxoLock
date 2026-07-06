import type { FormEvent } from "react";
import { useState } from "react";
import { fmtAvax, fmtDate, leaseStateLabel } from "../lib/format";
import { getLeaseDetails, resolveDispute } from "../web3/auxoLock";
import { useWallet } from "../web3/wallet";
import type { LeaseView } from "../types/lease";

export function AdminPage() {
  const { provider, account } = useWallet();
  const [leaseId, setLeaseId] = useState(1);
  const [finalDamages, setFinalDamages] = useState("0");
  const [lease, setLease] = useState<LeaseView | null>(null);
  const [status, setStatus] = useState("");

  async function loadLease() {
    if (!provider) {
      setStatus("Connect wallet first.");
      return;
    }

    try {
      setStatus("Loading lease details...");
      const details = await getLeaseDetails(provider, leaseId);
      setLease(details);
      
      // Pre-fill with proposed damages
      setFinalDamages(Number(details.proposedDamages) / 1e18 + "");
      
      if (details.state === 3) {
        setStatus("✅ Dispute found. Review details and set final damage amount.");
      } else {
        setStatus(`⚠️ Lease is in ${leaseStateLabel(details.state)} state (not disputed).`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load lease");
    }
  }

  async function onResolve(event: FormEvent) {
    event.preventDefault();
    
    if (!provider || !lease) {
      setStatus("Load lease first.");
      return;
    }

    if (lease.state !== 3) {
      setStatus("Can only resolve disputes (state must be DISPUTED).");
      return;
    }

    try {
      setStatus("Resolving dispute (arbiter only)...");
      await resolveDispute(provider, leaseId, finalDamages);
      setStatus("✅ Dispute resolved successfully. Lease is now SETTLED.");
      
      // Reload to show updated state
      await loadLease();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to resolve dispute");
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-black">🛡️ Admin: Dispute Resolution</h1>
        <p className="text-purple-200">Arbiter-only interface for resolving disputes</p>
        {account && (
          <p className="mt-2 rounded-lg bg-purple-800/50 px-3 py-1 font-mono text-xs">
            Arbiter: {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        )}
      </div>

      {/* Load Dispute */}
      <div className="rounded-2xl bg-white/80 p-6 shadow-lg space-y-4">
        <h2 className="text-xl font-bold text-slate-900">1️⃣ Load Disputed Lease</h2>
        <div className="flex gap-3">
          <input
            type="number"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-mono"
            placeholder="Lease ID"
            value={leaseId}
            onChange={(e) => setLeaseId(Number(e.target.value))}
          />
          <button
            onClick={loadLease}
            className="rounded-xl bg-indigo-600 px-6 py-2 font-bold text-white shadow transition hover:bg-indigo-700"
          >
            Load Lease
          </button>
        </div>
      </div>

      {/* Lease Details */}
      {lease && (
        <div className="rounded-2xl bg-white/80 p-6 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-slate-900">2️⃣ Dispute Details</h2>
            <span
              className={`rounded-full px-4 py-1 text-sm font-bold ${
                lease.state === 3
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
            >
              {leaseStateLabel(lease.state)}
            </span>
          </div>

          {/* Freeze Warning */}
          {lease.state === 3 && (
            <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4">
              <p className="font-bold text-red-900">❄️ FUNDS FROZEN</p>
              <p className="text-sm text-red-700">Neither party can withdraw until you resolve this dispute.</p>
            </div>
          )}

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Original Deposit</p>
              <p className="font-mono text-xl font-bold text-slate-900">{fmtAvax(lease.depositAmount)} AVAX</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Allocated Yield (Frozen)</p>
              <p className="font-mono text-xl font-bold text-green-700">{fmtAvax(lease.allocatedYield)} AVAX</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-300 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">Landlord Proposed Damages</p>
              <p className="font-mono text-xl font-bold text-amber-900">{fmtAvax(lease.proposedDamages)} AVAX</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Lease End Date</p>
              <p className="font-semibold text-slate-900">{fmtDate(lease.leaseEndDate)}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2 text-sm">
            <p className="font-bold text-blue-900">📋 Parties Involved</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide">👤 Tenant</p>
                <p className="font-mono text-blue-900">{lease.tenant}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide">🏠 Landlord</p>
                <p className="font-mono text-blue-900">{lease.landlord}</p>
              </div>
            </div>
          </div>

          {/* Settlement Preview */}
          {lease.state === 3 && (
            <div className="rounded-xl bg-purple-50 border border-purple-300 p-4 space-y-2">
              <p className="font-bold text-purple-900">🔮 Current Proposal (Disputed)</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Original Deposit:</span>
                  <span className="font-mono font-semibold text-slate-900">{fmtAvax(lease.depositAmount)} AVAX</span>
                </div>
                <div className="h-px bg-purple-200 my-1"></div>
                <div className="flex justify-between">
                  <span className="text-red-600">− Proposed Damages:</span>
                  <span className="font-mono font-semibold text-red-700">{fmtAvax(lease.proposedDamages)} AVAX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">+ Frozen Yield:</span>
                  <span className="font-mono font-semibold text-green-700">{fmtAvax(lease.allocatedYield)} AVAX</span>
                </div>
                <div className="h-px bg-purple-200 my-1"></div>
                <div className="flex justify-between text-xs text-purple-700">
                  <span>Would give Tenant:</span>
                  <span className="font-mono">
                    {fmtAvax(lease.depositAmount - lease.proposedDamages + lease.allocatedYield)} AVAX
                  </span>
                </div>
                <div className="flex justify-between text-xs text-purple-700">
                  <span>Would give Landlord:</span>
                  <span className="font-mono">{fmtAvax(lease.proposedDamages)} AVAX</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolution Form */}
      {lease && lease.state === 3 && (
        <form onSubmit={onResolve} className="rounded-2xl bg-white/80 p-6 shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-slate-900">3️⃣ Set Final Damage Amount</h2>
          <p className="text-sm text-slate-600">
            Review evidence off-chain, then enter your final decision below. This will settle the lease immediately.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Final Damage Amount (AVAX)</label>
            <input
              type="text"
              className="w-full rounded-lg border-2 border-indigo-300 px-4 py-3 font-mono text-lg focus:border-indigo-500 focus:outline-none"
              placeholder="0.0000"
              value={finalDamages}
              onChange={(e) => setFinalDamages(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              ⚖️ You can set any amount between 0 and {fmtAvax(lease.depositAmount)} AVAX
            </p>
          </div>

          {/* Preview */}
          {finalDamages && !isNaN(Number(finalDamages)) && (
            <div className="rounded-xl bg-green-50 border-2 border-green-300 p-4 space-y-2">
              <p className="font-bold text-green-900">✅ Resolution Preview</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Deposit:</span>
                  <span className="font-mono text-slate-900">{fmtAvax(lease.depositAmount)} AVAX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">− Your Final Damages:</span>
                  <span className="font-mono text-red-700">{Number(finalDamages).toFixed(4)} AVAX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">+ Frozen Yield:</span>
                  <span className="font-mono text-green-700">{fmtAvax(lease.allocatedYield)} AVAX</span>
                </div>
                <div className="h-px bg-green-300 my-2"></div>
                <div className="flex justify-between font-bold">
                  <span className="text-blue-700">→ Tenant Will Get:</span>
                  <span className="font-mono text-blue-900">
                    {(Number(fmtAvax(lease.depositAmount)) - Number(finalDamages) + Number(fmtAvax(lease.allocatedYield))).toFixed(4)} AVAX
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-blue-700">→ Landlord Will Get:</span>
                  <span className="font-mono text-blue-900">{Number(finalDamages).toFixed(4)} AVAX</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-indigo-700"
          >
            🛡️ Resolve Dispute & Settle Lease
          </button>
        </form>
      )}

      {/* Status */}
      {status && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status.includes("✅")
              ? "bg-green-50 border-green-300 text-green-900"
              : status.includes("⚠️")
                ? "bg-yellow-50 border-yellow-300 text-yellow-900"
                : "bg-blue-50 border-blue-300 text-blue-900"
          }`}
        >
          {status}
        </div>
      )}

      {/* Educational Note */}
      <div className="rounded-2xl bg-slate-100 border border-slate-300 p-6 text-sm text-slate-700 space-y-2">
        <p className="font-bold text-slate-900">📚 How Dispute Resolution Works (MVP)</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Tenant raises dispute → lease enters DISPUTED state → funds freeze ❄️</li>
          <li>Both parties provide evidence OFF-CHAIN (email, photos, documents)</li>
          <li>You (arbiter) review evidence manually</li>
          <li>You enter final damage amount → contract settles lease automatically</li>
          <li>Yield remains frozen at proposed amount (calculated at settlement time)</li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          🔮 <strong>Production upgrade path:</strong> On-chain evidence (IPFS), DAO voting, appeal process, time limits
        </p>
      </div>
    </section>
  );
}
