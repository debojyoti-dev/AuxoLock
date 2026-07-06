import { useEffect, useState } from "react";
import { fmtAvax, fmtDate, leaseStateLabel } from "../lib/format";
import { getLeaseDetails, getMyLeases, getYieldInfo } from "../web3/auxoLock";
import { useWallet } from "../web3/wallet";
import type { LeaseView } from "../types/lease";

interface LeaseCard {
  lease: LeaseView;
  projected: bigint;
  safe: bigint;
}

export function DashboardPage() {
  const { provider, account } = useWallet();
  const [leases, setLeases] = useState<LeaseCard[]>([]);
  const [status, setStatus] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load leases once
  async function loadLeases() {
    if (!provider || !account) {
      setStatus("Connect wallet first.");
      return;
    }

    setStatus("Loading leases...");
    const leaseIds = await getMyLeases(provider, account);

    if (leaseIds.length === 0) {
      setLeases([]);
      setStatus("No leases found for this wallet.");
      return;
    }

    const cards: LeaseCard[] = [];
    for (const id of leaseIds) {
      const lease = await getLeaseDetails(provider, Number(id));
      const yieldInfo = await getYieldInfo(provider, Number(id));
      cards.push({
        lease,
        projected: yieldInfo.projected,
        safe: yieldInfo.safe,
      });
    }

    setLeases(cards);
    setStatus(`Loaded ${cards.length} lease(s). Auto-refresh enabled.`);
    setAutoRefresh(true);
  }

  // Refresh yield only (every 10s when autoRefresh is on)
  async function refreshYield() {
    if (!provider || leases.length === 0) return;

    const updated = await Promise.all(
      leases.map(async (card) => {
        const yieldInfo = await getYieldInfo(provider, Number(card.lease.leaseId));
        return {
          ...card,
          projected: yieldInfo.projected,
          safe: yieldInfo.safe,
        };
      }),
    );

    setLeases(updated);
  }

  // Auto-refresh yield every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshYield();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, leases, provider]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Live Dashboard</h1>
          <p className="text-slate-700">Real-time lease monitoring • Refreshes every 10s</p>
        </div>
        <button onClick={loadLeases} className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:bg-amber-400">
          {leases.length > 0 ? "↻ Reload" : "Load My Leases"}
        </button>
      </div>

      {status && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-900">
          {status}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {leases.length === 0 ? (
          <div className="col-span-2 rounded-2xl bg-white/80 p-12 text-center shadow-lg">
            <p className="text-slate-500">No leases loaded yet. Click "Load My Leases" above.</p>
          </div>
        ) : (
          leases.map((card) => (
            <LeaseCard key={Number(card.lease.leaseId)} card={card} />
          ))
        )}
      </div>
    </section>
  );
}

// Individual lease card component
function LeaseCard({ card }: { card: LeaseCard }) {
  const { lease, projected, safe } = card;

  // State badge color mapping
  const stateStyles = {
    0: "bg-blue-100 text-blue-800 border-blue-300", // CREATED
    1: "bg-green-100 text-green-800 border-green-300", // ACTIVE
    2: "bg-yellow-100 text-yellow-800 border-yellow-300", // SETTLEMENT_PROPOSED
    3: "bg-red-100 text-red-800 border-red-300", // DISPUTED
    4: "bg-slate-100 text-slate-800 border-slate-300", // SETTLED
  };

  const isSettled = lease.state === 2 || lease.state === 4; // SETTLEMENT_PROPOSED or SETTLED

  return (
    <div className="rounded-2xl bg-white/90 p-6 shadow-xl border border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900">Lease #{Number(lease.leaseId)}</h3>
          <p className="text-xs text-slate-500 font-mono">{lease.propertyDetails || "No details"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${stateStyles[lease.state as keyof typeof stateStyles]}`}>
          {leaseStateLabel(lease.state)}
        </span>
      </div>

      {/* Deposit & Dates */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Deposit</p>
          <p className="font-mono text-lg font-bold text-slate-900">{fmtAvax(lease.depositAmount)} AVAX</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">End Date</p>
          <p className="font-semibold text-slate-900">{fmtDate(lease.leaseEndDate)}</p>
        </div>
      </div>

      {/* Live Yield Ticker */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">🔄 Live Safe Yield</p>
            <p className="font-mono text-2xl font-black text-emerald-900">{fmtAvax(safe)} AVAX</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Projected</p>
            <p className="font-mono text-sm text-slate-700">{fmtAvax(projected)} AVAX</p>
          </div>
        </div>
      </div>

      {/* Freeze Warning for Disputed Leases */}
      {lease.state === 3 && (
        <div className="rounded-xl bg-red-50 border-2 border-red-400 p-4 flex items-center gap-3">
          <span className="text-3xl">❄️</span>
          <div className="flex-1">
            <p className="font-bold text-red-900">FUNDS FROZEN</p>
            <p className="text-sm text-red-700">This lease is in dispute. Withdrawals blocked until arbiter resolves.</p>
          </div>
          <span className="text-xs font-mono bg-red-200 text-red-900 px-2 py-1 rounded">DISPUTED</span>
        </div>
      )}

      {/* Settlement Breakdown (only if SETTLEMENT_PROPOSED or SETTLED) */}
      {isSettled && (
        <div className="rounded-xl bg-slate-50 border border-slate-300 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">💰 Settlement Breakdown</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Original Deposit:</span>
              <span className="font-mono font-semibold text-slate-900">{fmtAvax(lease.depositAmount)} AVAX</span>
            </div>
            <div className="h-px bg-slate-300 my-1"></div>
            <div className="flex justify-between">
              <span className="text-red-600">− Damages:</span>
              <span className="font-mono font-semibold text-red-700">{fmtAvax(lease.proposedDamages)} AVAX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">+ Yield:</span>
              <span className="font-mono font-semibold text-green-700">{fmtAvax(lease.allocatedYield)} AVAX</span>
            </div>
            <div className="h-px bg-slate-300 my-1"></div>
            <div className="flex justify-between font-bold">
              <span className="text-blue-700">→ Tenant Gets:</span>
              <span className="font-mono text-blue-900">{fmtAvax(lease.tenantBalance)} AVAX</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-blue-700">→ Landlord Gets:</span>
              <span className="font-mono text-blue-900">{fmtAvax(lease.landlordBalance)} AVAX</span>
            </div>
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>👤 Tenant: <span className="font-mono">{lease.tenant.slice(0, 6)}...{lease.tenant.slice(-4)}</span></p>
        <p>🏠 Landlord: <span className="font-mono">{lease.landlord.slice(0, 6)}...{lease.landlord.slice(-4)}</span></p>
      </div>
    </div>
  );
}
