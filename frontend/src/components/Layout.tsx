import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../web3/wallet";

const nav = [
  ["/", "Landing"],
  ["/create-lease", "Create Lease"],
  ["/deposit-funds", "Deposit Funds"],
  ["/dashboard", "Dashboard"],
  ["/settlement", "Settlement"],
  ["/admin", "Admin"],
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { account, connect } = useWallet();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5ebd2_0%,_#e2f1ee_45%,_#f7f7f4_100%)] text-slate-900">
      <header className="border-b border-slate-300/60 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            AuxoLock
          </Link>
          <nav className="hidden gap-5 text-sm font-semibold md:flex">
            {nav.map(([path, label]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  isActive ? "text-teal-800" : "text-slate-600 hover:text-slate-900"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={connect}
            className="rounded-full bg-teal-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
