"use client";

import { profileLabel } from "@/lib/helpers";

const DEFAULT_IDS = ["profil1", "profil2", "commun"];

export default function ProfileTabs({ value, onChange, includeAll = false, profiles = [], ids }) {
  const idList = ids || DEFAULT_IDS;
  const options = idList.map((id) => ({ id, label: profileLabel(profiles, id) }));
  const all = includeAll ? [{ id: "all", label: "Tous" }, ...options] : options;

  return (
    <div className="inline-flex p-1 rounded-xl bg-cloud dark:bg-ink-soft gap-1 flex-wrap">
      {all.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition
            ${value === opt.id
              ? "bg-white dark:bg-ink text-ink dark:text-porcelain shadow-sm"
              : "text-ink/50 dark:text-porcelain/50 hover:text-ink dark:hover:text-porcelain"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
