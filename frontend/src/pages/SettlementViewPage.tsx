import type { FormEvent } from "react";
import { useState } from "react";
import { acceptSettlement, disputeSettlement, proposeSettlement } from "../web3/auxoLock";
import { useWallet } from "../web3/wallet";

export function SettlementViewPage() {
  const { provider } = useWallet();
  const [leaseId, setLeaseId] = useState(1);
  const [damages, setDamages] = useState("0");
  const [status, setStatus] = useState("");

  async function run(label: string, fn: () => Promise<unknown>) {
    if (!provider) {
      setStatus("Connect wallet first.");
      return;
    }

    try {
      setStatus(`${label} in progress...`);
      await fn();
      setStatus(`${label} complete.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${label} failed`);
    }
  }

  async function onPropose(event: FormEvent) {
    event.preventDefault();
    await run("Propose settlement", () => proposeSettlement(provider!, leaseId, damages));
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Settlement View</h1>
      <p className="text-slate-700">Landlord proposes, tenant accepts or disputes. Dispute freezes movement.</p>

      <form onSubmit={onPropose} className="grid gap-4 rounded-2xl bg-white/80 p-6 shadow-lg">
        <label className="text-sm font-semibold">Lease ID</label>
        <input
          type="number"
          className="rounded-lg border px-3 py-2"
          value={leaseId}
          onChange={(e) => setLeaseId(Number(e.target.value))}
        />

        <label className="text-sm font-semibold">Damage Amount (AVAX)</label>
        <input className="rounded-lg border px-3 py-2" value={damages} onChange={(e) => setDamages(e.target.value)} />

        <button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Propose Settlement</button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run("Accept settlement", () => acceptSettlement(provider!, leaseId))}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
        >
          Accept Settlement
        </button>
        <button
          onClick={() => run("Dispute settlement", () => disputeSettlement(provider!, leaseId))}
          className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white"
        >
          Raise Dispute
        </button>
      </div>

      {status && <p className="text-sm text-slate-700">{status}</p>}
    </section>
  );
}
