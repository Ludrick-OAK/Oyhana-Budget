"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatEuro, profileLabel, GROUPE_LABELS, GROUPE_TARGET_PCT } from "@/lib/helpers";
import { PageHeader, BudgetProgress, EmptyState } from "@/components/UI";
import { useAuth } from "@/components/AuthProvider";

const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const GROUPES = ["besoins", "envies", "epargne"];

const TONE_BAR = { emerald: "bg-emerald", amber: "bg-amber", coral: "bg-coral" };
const TONE_TEXT = { emerald: "text-emerald", amber: "text-amber", coral: "text-coral" };

function toneFor(pct) {
  if (pct >= 100) return "coral";
  if (pct >= 80) return "amber";
  return "emerald";
}

export default function BudgetsPage() {
  const { session } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [profiles, setProfiles] = useState([]);
  const [charges, setCharges] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: fc }, { data: t }, { data: cat }] = await Promise.all([
      supabase.from("profiles").select("*").order("id"),
      supabase.from("fixed_charges").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("categories").select("*").order("nom"),
    ]);
    setProfiles(p || []);
    setCharges(fc || []);
    setTransactions(t || []);
    setCategories(cat || []);
    setLoading(false);
  }

  useEffect(() => { if (session) load(); }, [session]);

  const personalProfiles = useMemo(() => profiles.filter((p) => p.id !== "commun"), [profiles]);

  const monthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }),
    [transactions, month, year]
  );

  // ---------- Budgets mensuels par profil (P1 / P2) ----------
  const spentByProfile = useMemo(() => {
    const map = {};
    personalProfiles.forEach((p) => {
      const varSpent = monthTx.filter((t) => t.profile_id === p.id && t.type === "depense").reduce((s, t) => s + Number(t.montant), 0);
      const fixedSpent = charges.filter((c) => c.profile_id === p.id).reduce((s, c) => s + Number(c.montant), 0);
      map[p.id] = varSpent + fixedSpent;
    });
    return map;
  }, [personalProfiles, monthTx, charges]);

  async function handleSaveBudget(profileId) {
    const value = Number(editing[profileId]);
    if (isNaN(value)) return;
    await supabase.from("profiles").update({ budget_mensuel: value }).eq("id", profileId);
    setEditing((e) => ({ ...e, [profileId]: undefined }));
    load();
  }

  // ---------- Règle 50/30/20 ----------
  const salaireBase = useMemo(() => {
    const salaireCat = categories.find((c) => c.nom.toLowerCase() === "salaire");
    if (!salaireCat) return 0;
    return monthTx
      .filter((t) => t.type === "revenu" && t.category_id === salaireCat.id && t.profile_id !== "commun")
      .reduce((s, t) => s + Number(t.montant), 0);
  }, [monthTx, categories]);

  const categoriesByGroupe = useMemo(() => {
    const map = { besoins: [], envies: [], epargne: [], unclassified: [] };
    categories.forEach((c) => {
      if (c.groupe && map[c.groupe]) map[c.groupe].push(c);
      else if (!c.groupe) map.unclassified.push(c);
    });
    return map;
  }, [categories]);

  const spentByCategory = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "depense").forEach((t) => {
      if (!t.category_id) return;
      map[t.category_id] = (map[t.category_id] || 0) + Number(t.montant);
    });
    // Les charges fixes comptent chaque mois, MAIS pas celles marquées comme contribution interne
    // (ex: "Participation loyer commun" de P1 vers Commun) : la charge équivalente côté Commun
    // représente déjà la vraie dépense, la compter aussi côté P1 la doublerait.
    charges.forEach((c) => {
      if (!c.category_id || c.contrepartie_profile_id) return;
      map[c.category_id] = (map[c.category_id] || 0) + Number(c.montant);
    });
    return map;
  }, [monthTx, charges]);

  const spentByGroupe = useMemo(() => {
    const map = { besoins: 0, envies: 0, epargne: 0 };
    categories.forEach((c) => {
      if (c.groupe && map[c.groupe] !== undefined) {
        map[c.groupe] += spentByCategory[c.id] || 0;
      }
    });
    return map;
  }, [categories, spentByCategory]);

  const chargesSansCategorie = useMemo(() => charges.filter((c) => !c.category_id).length, [charges]);

  async function handleChangeGroupe(categoryId, groupe) {
    await supabase.from("categories").update({ groupe: groupe || null }).eq("id", categoryId);
    load();
  }

  const [budgetEdits, setBudgetEdits] = useState({});
  async function handleSaveCategoryBudget(categoryId) {
    const value = Number(budgetEdits[categoryId]);
    if (isNaN(value)) return;
    await supabase.from("categories").update({ budget_max: value }).eq("id", categoryId);
    setBudgetEdits((e) => ({ ...e, [categoryId]: undefined }));
    load();
  }

  // ---------- Analyse interne / externe ----------
  const internalExternal = useMemo(() => {
    const sum = (type, internal) => monthTx
      .filter((t) => t.type === type && (internal ? !!t.contrepartie_profile_id : !t.contrepartie_profile_id))
      .reduce((s, t) => s + Number(t.montant), 0);
    return {
      depensesExternes: sum("depense", false),
      depensesInternes: sum("depense", true),
      revenusExternes: sum("revenu", false),
      revenusInternes: sum("revenu", true),
    };
  }, [monthTx]);

  if (loading) return <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>;

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Plafonds par profil, répartition 50/30/20 et analyse des transferts"
        action={
          <div className="flex items-center gap-2">
            <select className="input !w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="input !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {/* Budgets mensuels par profil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
        {personalProfiles.map((p) => {
          const max = Number(p.budget_mensuel || 0);
          const spent = spentByProfile[p.id] || 0;
          const remaining = max - spent;
          const isEditing = editing[p.id] !== undefined;
          return (
            <div key={p.id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">{profileLabel(profiles, p.id)}</h3>
                {!isEditing ? (
                  <button className="text-xs text-violet font-medium" onClick={() => setEditing((e) => ({ ...e, [p.id]: String(max) }))}>
                    Modifier le budget
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="10" className="input !w-28 !py-1"
                      value={editing[p.id]} onChange={(e) => setEditing((ed) => ({ ...ed, [p.id]: e.target.value }))} />
                    <button className="text-xs text-emerald font-medium" onClick={() => handleSaveBudget(p.id)}>OK</button>
                  </div>
                )}
              </div>

              {max <= 0 ? (
                <p className="text-sm text-ink/40 dark:text-porcelain/40">Aucun budget défini pour ce profil.</p>
              ) : (
                <>
                  <BudgetProgress label="Consommation du mois" spent={spent} max={max} />
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-line dark:border-ink-soft">
                    <div>
                      <p className="text-xs text-ink/40 dark:text-porcelain/40">Budget</p>
                      <p className="font-semibold text-sm mt-0.5">{formatEuro(max)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/40 dark:text-porcelain/40">Dépensé</p>
                      <p className="font-semibold text-sm mt-0.5">{formatEuro(spent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/40 dark:text-porcelain/40">Restant</p>
                      <p className={`font-semibold text-sm mt-0.5 ${remaining >= 0 ? "text-emerald" : "text-coral"}`}>
                        {formatEuro(remaining)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Règle 50/30/20 */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="font-display font-bold text-xl">Répartition 50/30/20</h2>
        <p className="text-sm text-ink/50 dark:text-porcelain/50">
          Base (salaires {MONTHS_FR[month - 1]}) : <span className="font-semibold text-ink dark:text-porcelain">{formatEuro(salaireBase)}</span>
        </p>
      </div>
      <p className="text-xs text-ink/40 dark:text-porcelain/40 mb-5">
        Calculée sur les revenus catégorie "Salaire" de {profileLabel(profiles, "profil1")} et {profileLabel(profiles, "profil2")} ce mois-ci.
      </p>

      {chargesSansCategorie > 0 && (
        <div className="card p-3 mb-5 bg-amber-soft border-amber/30 text-sm text-amber">
          {chargesSansCategorie} charge{chargesSansCategorie > 1 ? "s" : ""} fixe{chargesSansCategorie > 1 ? "s" : ""} sans catégorie —
          elle{chargesSansCategorie > 1 ? "s" : ""} n'{chargesSansCategorie > 1 ? "apparaissent" : "apparaît"} pas dans l'analyse ci-dessous.
          Ajoute une catégorie depuis l'onglet Charges fixes pour corriger ça.
        </div>
      )}

      {categoriesByGroupe.unclassified.length > 0 && (
        <div className="card p-4 mb-5">
          <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 mb-2">
            Catégories non classées (ex : Salaire — sert de base au calcul, pas besoin de la classer)
          </p>
          <div className="flex flex-wrap gap-2">
            {categoriesByGroupe.unclassified.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-cloud dark:bg-ink-soft rounded-lg px-2.5 py-1.5">
                <span className="text-sm">{c.nom}</span>
                <select className="text-xs bg-transparent border-0 focus:outline-none text-violet"
                  value="" onChange={(e) => handleChangeGroupe(c.id, e.target.value)}>
                  <option value="">Classer...</option>
                  {GROUPES.map((g) => <option key={g} value={g}>{GROUPE_LABELS[g]}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {GROUPES.map((g) => {
          const target = salaireBase * GROUPE_TARGET_PCT[g];
          const cats = categoriesByGroupe[g];
          const totalBudgetMax = cats.reduce((s, c) => s + Number(c.budget_max || 0), 0);
          const totalSpent = spentByGroupe[g] || 0;
          const pctBudget = target > 0 ? Math.round((totalBudgetMax / target) * 100) : 0;
          const pctSpent = target > 0 ? Math.round((totalSpent / target) * 100) : 0;
          const toneBudget = toneFor(pctBudget);
          const toneSpent = toneFor(pctSpent);
          return (
            <div key={g} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold">{GROUPE_LABELS[g]}</h3>
                <span className="text-xs font-semibold text-ink/40 dark:text-porcelain/40">{Math.round(GROUPE_TARGET_PCT[g] * 100)}%</span>
              </div>
              <p className="text-xs text-ink/40 dark:text-porcelain/40 mb-3">Objectif : {formatEuro(target)}</p>

              <div className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-semibold ${TONE_TEXT[toneSpent]}`}>{formatEuro(totalSpent)} dépensés (réel)</span>
                  <span className={`font-semibold ${TONE_TEXT[toneSpent]}`}>{pctSpent}%</span>
                </div>
                <div className="h-2 rounded-full w-full bg-cloud dark:bg-ink-soft">
                  <div className={`h-2 rounded-full ${TONE_BAR[toneSpent]}`} style={{ width: `${Math.min(100, pctSpent)}%` }} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink/40 dark:text-porcelain/40">{formatEuro(totalBudgetMax)} budgétés (prévisionnel)</span>
                  <span className="text-ink/40 dark:text-porcelain/40">{pctBudget}%</span>
                </div>
                <div className="h-1.5 rounded-full w-full bg-cloud dark:bg-ink-soft">
                  <div className="h-1.5 rounded-full bg-ink/30 dark:bg-porcelain/30" style={{ width: `${Math.min(100, pctBudget)}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {cats.length === 0 && <p className="text-xs text-ink/30 dark:text-porcelain/30">Aucune catégorie dans ce groupe.</p>}
                {cats.map((c) => {
                  const isEditingBudget = budgetEdits[c.id] !== undefined;
                  const spent = spentByCategory[c.id] || 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-t border-line dark:border-ink-soft pt-2 first:border-0 first:pt-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{c.nom}</span>
                          <select className="text-[10px] bg-transparent border-0 text-ink/30 dark:text-porcelain/30 focus:outline-none"
                            value={g} onChange={(e) => handleChangeGroupe(c.id, e.target.value)}>
                            {GROUPES.map((gg) => <option key={gg} value={gg}>{GROUPE_LABELS[gg]}</option>)}
                          </select>
                        </div>
                        <p className="text-xs text-ink/40 dark:text-porcelain/40">
                          {formatEuro(spent)} dépensés
                          {target > 0 && <span className="text-ink/30 dark:text-porcelain/30"> · {Math.round((spent / target) * 100)}% du groupe</span>}
                        </p>
                      </div>
                      {isEditingBudget ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input type="number" min="0" step="5" className="input !w-20 !py-1 !px-2 text-xs"
                            value={budgetEdits[c.id]} onChange={(e) => setBudgetEdits((b) => ({ ...b, [c.id]: e.target.value }))} />
                          <button className="text-xs text-emerald" onClick={() => handleSaveCategoryBudget(c.id)}>OK</button>
                        </div>
                      ) : (
                        <button className="text-xs font-medium text-ink/60 dark:text-porcelain/60 shrink-0"
                          onClick={() => setBudgetEdits((b) => ({ ...b, [c.id]: String(c.budget_max || 0) }))}>
                          max {formatEuro(c.budget_max || 0)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analyse par catégorie : réel vs budget max */}
      <h2 className="font-display font-bold text-xl mb-4">Analyse par catégorie — {MONTHS_FR[month - 1]} {year}</h2>
      {(() => {
        const rows = categories
          .filter((c) => (spentByCategory[c.id] || 0) > 0 || Number(c.budget_max) > 0)
          .sort((a, b) => (spentByCategory[b.id] || 0) - (spentByCategory[a.id] || 0));

        if (rows.length === 0) {
          return <EmptyState text="Aucune dépense ni budget défini pour l'instant." />;
        }

        return (
          <div className="card overflow-hidden mb-10">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cloud dark:bg-ink-soft text-ink/50 dark:text-porcelain/50 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Catégorie</th>
                    <th className="text-left px-4 py-3">Groupe</th>
                    <th className="text-right px-4 py-3">Dépensé</th>
                    <th className="text-right px-4 py-3">Budget max</th>
                    <th className="text-right px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const spent = spentByCategory[c.id] || 0;
                    const hasBudget = Number(c.budget_max) > 0;
                    const pct = hasBudget ? Math.round((spent / c.budget_max) * 100) : 0;
                    const tone = toneFor(pct);
                    const label = !hasBudget ? "Pas de budget défini" : pct >= 100 ? "Dépassé" : pct >= 80 ? "Proche" : "Respecté";
                    return (
                      <tr key={c.id} className="border-t border-line dark:border-ink-soft">
                        <td className="px-4 py-3 font-medium">{c.nom}</td>
                        <td className="px-4 py-3 text-ink/50 dark:text-porcelain/50">{c.groupe ? GROUPE_LABELS[c.groupe] : "—"}</td>
                        <td className="px-4 py-3 text-right">{formatEuro(spent)}</td>
                        <td className="px-4 py-3 text-right">{hasBudget ? formatEuro(c.budget_max) : "—"}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${hasBudget ? TONE_TEXT[tone] : "text-ink/30 dark:text-porcelain/30"}`}>
                          {label}{hasBudget ? ` (${pct}%)` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Analyse interne / externe */}
      <h2 className="font-display font-bold text-xl mb-4">Transactions internes vs externes — {MONTHS_FR[month - 1]} {year}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 uppercase">Dépenses externes</p>
          <p className="font-display font-bold text-xl text-coral mt-2">{formatEuro(internalExternal.depensesExternes)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 uppercase">Dépenses internes</p>
          <p className="font-display font-bold text-xl text-violet mt-2">{formatEuro(internalExternal.depensesInternes)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 uppercase">Revenus externes</p>
          <p className="font-display font-bold text-xl text-emerald mt-2">{formatEuro(internalExternal.revenusExternes)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-ink/50 dark:text-porcelain/50 uppercase">Revenus internes</p>
          <p className="font-display font-bold text-xl text-violet mt-2">{formatEuro(internalExternal.revenusInternes)}</p>
        </div>
      </div>
    </div>
  );
}
