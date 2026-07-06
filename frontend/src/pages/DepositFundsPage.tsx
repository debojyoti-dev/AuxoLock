import type { FormEvent } from "react";
import { useState } from "react";
import { depositFunds } from "../web3/auxoLock";
import { useWallet } from "../web3/wallet";

export function DepositFundsPage() {
  const { provider } = useWallet();
  const [leaseId, setLeaseId] = useState(1);
  const [deposit, setDeposit] = useState("1");
  const [status, setStatus] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!provider) {
      setStatus("Connect wallet first.");
      return;
    }

    try {
      setStatus("Submitting deposit...");
      const receipt = await depositFunds(provider, leaseId, deposit);
      setStatus(`Deposit locked. Tx: ${receipt?.hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deposit failed");
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Deposit Funds</h1>
      <p className="text-slate-700">Tenant sends exact amount to activate escrow lock.</p>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl bg-white/80 p-6 shadow-lg">
        <label className="text-sm font-semibold">Lease ID</label>
        <input
          className="rounded-lg border px-3 py-2"
          type="number"
          value={leaseId}
          onChange={(e) => setLeaseId(Number(e.target.value))}
        />

        <label className="text-sm font-semibold">Deposit Amount (AVAX)</label>
        <input className="rounded-lg border px-3 py-2" value={deposit} onChange={(e) => setDeposit(e.target.value)} />

        <button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Lock Deposit</button>
      </form>

      {status && <p className="text-sm text-slate-700">{status}</p>}
    </section>
  );
}
