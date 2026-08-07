"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: "grid" },
  { href: "/transactions", label: "Revenus & dépenses", icon: "swap" },
  { href: "/charges", label: "Charges fixes", icon: "pin" },
  { href: "/budgets", label: "Budgets", icon: "target" },
  { href: "/categories", label: "Catégories", icon: "tag" },
  { href: "/historique", label: "Historique", icon: "clock" },
  { href: "/parametres", label: "Paramètres", icon: "settings" },
];

function Icon({ name, className }) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    swap: "M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3",
    pin: "M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z",
    target: "M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    tag: "M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3.24a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.82ZM7 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
    clock: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r border-line dark:border-ink-soft
                       bg-white dark:bg-ink-light min-h-screen sticky top-0 py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald to-violet flex items-center justify-center">
          <span className="text-white font-display font-bold text-sm">O</span>
        </div>
        <div>
          <p className="font-display font-bold text-base leading-none">Oyhana</p>
          <p className="text-xs text-ink/50 dark:text-porcelain/50">Budget</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${active
                  ? "bg-ink text-white dark:bg-emerald dark:text-ink"
                  : "text-ink/60 hover:bg-cloud dark:text-porcelain/60 dark:hover:bg-ink-soft"}`}
            >
              <Icon name={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 pt-4 border-t border-line dark:border-ink-soft">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          text-ink/60 hover:bg-cloud dark:text-porcelain/60 dark:hover:bg-ink-soft transition">
          {theme === "dark" ? "☀️ Mode clair" : "🌙 Mode sombre"}
        </button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          text-coral hover:bg-coral-soft transition">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
