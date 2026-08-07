"use client";

import { formatEuro } from "@/lib/helpers";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="font-display font-bold text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-ink/50 dark:text-porcelain/50 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, tone = "default", hint }) {
  const tones = {
    default: "text-ink dark:text-porcelain",
    emerald: "text-emerald",
    coral: "text-coral",
    amber: "text-amber",
    violet: "text-violet",
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 uppercase tracking-wide">{label}</p>
      <p className={`font-display font-bold text-2xl mt-2 ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-ink/40 dark:text-porcelain/40 mt-1">{hint}</p>}
    </div>
  );
}

const TONE_BAR = {
  emerald: "bg-emerald",
  amber: "bg-amber",
  coral: "bg-coral",
};
const TONE_BG = {
  emerald: "bg-emerald-soft",
  amber: "bg-amber-soft",
  coral: "bg-coral-soft",
};
const TONE_TEXT = {
  emerald: "text-emerald",
  amber: "text-amber",
  coral: "text-coral",
};

export function BudgetProgress({ label, spent, max }) {
  const pct = max > 0 ? Math.min(999, Math.round((spent / max) * 100)) : 0;
  const tone = pct >= 100 ? "coral" : pct >= 80 ? "amber" : "emerald";
  const width = Math.min(100, pct);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>{pct}%</p>
      </div>
      <div className={`h-2.5 rounded-full w-full ${TONE_BG[tone]}`}>
        <div className={`h-2.5 rounded-full ${TONE_BAR[tone]} transition-all`} style={{ width: `${width}%` }} />
      </div>
      <div className="flex justify-between text-xs text-ink/50 dark:text-porcelain/50 mt-1.5">
        <span>{formatEuro(spent)} dépensés</span>
        <span>Budget {formatEuro(max)}</span>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink dark:text-porcelain/40 dark:hover:text-porcelain">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="card p-10 text-center text-sm text-ink/40 dark:text-porcelain/40">
      {text}
    </div>
  );
}
