"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/transactions", label: "Mouvements", icon: "💳" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/historique", label: "Historique", icon: "🕐" },
  { href: "/parametres", label: "Réglages", icon: "⚙️" },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-ink-light
                     border-t border-line dark:border-ink-soft flex justify-around py-2 px-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium
              ${active ? "text-emerald" : "text-ink/50 dark:text-porcelain/50"}`}>
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
