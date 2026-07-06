import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
      <div>
        <p className="mb-3 inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
          Avalanche Fuji dApp
        </p>
        <h1 className="font-display text-5xl font-black leading-tight text-slate-900 md:text-6xl">
          Rental escrow that locks principal and simulates safe yield.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-700">
          AuxoLock protects tenant deposits, tracks yield separately, and handles settlement with
          dispute freeze rules.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/create-lease"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Create First Lease
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-slate-400"
          >
            Open Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur">
        <h2 className="text-sm font-bold uppercase tracking-wide text-teal-800">Safety Model</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li>1. Principal bucket is never used to pay yield.</li>
          <li>2. Yield comes from a separate reserve.</li>
          <li>3. Settlement freezes yield allocation when proposed.</li>
          <li>4. Dispute state halts withdrawals until resolution.</li>
          <li>5. Payout math enforces principal invariants.</li>
        </ul>
      </div>
    </section>
  );
}
