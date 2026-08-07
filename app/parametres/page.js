"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { profileLabel, monthBounds } from "@/lib/helpers";
import { PageHeader } from "@/components/UI";
import { useAuth } from "@/components/AuthProvider";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function ParametresPage() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [prenoms, setPrenoms] = useState({ profil1: "", profil2: "" });

  const [razYear, setRazYear] = useState(new Date().getFullYear());
  const [razMonth, setRazMonth] = useState(new Date().getMonth() + 1);
  const [razProfile, setRazProfile] = useState("profil1");

  const [chargesProfile, setChargesProfile] = useState("profil1");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("id");
    setProfiles(data || []);
    const p1 = data?.find((p) => p.id === "profil1");
    const p2 = data?.find((p) => p.id === "profil2");
    setPrenoms({ profil1: p1?.prenom || "", profil2: p2?.prenom || "" });
    setLoading(false);
  }

  useEffect(() => { if (session) load(); }, [session]);

  function flash(msg) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  async function handleSavePrenom(profileId) {
    const value = prenoms[profileId]?.trim();
    if (!value) return;
    setBusy(true);
    await supabase.from("profiles").update({ prenom: value }).eq("id", profileId);
    await load();
    setBusy(false);
    flash(`Prénom de ${profileId === "profil1" ? "Profil 1" : "Profil 2"} mis à jour.`);
  }

  async function handleRazTransactions() {
    const label = `${MONTHS_FR[razMonth - 1]} ${razYear}`;
    if (!confirm(`Supprimer TOUS les mouvements (revenus & dépenses) de ${profileLabel(profiles, razProfile)} pour ${label} ? Les écritures miroir liées seront aussi supprimées. Cette action est irréversible.`)) return;
    setBusy(true);
    const { start, end } = monthBounds(razYear, razMonth);
    const { data: toDelete } = await supabase
      .from("transactions")
      .select("id, linked_transaction_id")
      .eq("profile_id", razProfile)
      .gte("date", start)
      .lte("date", end);

    const linkedIds = (toDelete || []).map((t) => t.linked_transaction_id).filter(Boolean);
    if (linkedIds.length > 0) {
      await supabase.from("transactions").delete().in("id", linkedIds);
    }
    await supabase.from("transactions").delete().eq("profile_id", razProfile).gte("date", start).lte("date", end);

    setBusy(false);
    flash(`Mouvements de ${profileLabel(profiles, razProfile)} pour ${label} réinitialisés (${(toDelete || []).length} mouvement(s) + miroirs liés).`);
  }

  async function handleRazCharges() {
    if (!confirm(`Supprimer TOUTES les charges fixes de ${profileLabel(profiles, chargesProfile)} ? Cette action est irréversible.`)) return;
    setBusy(true);
    await supabase.from("fixed_charges").delete().eq("profile_id", chargesProfile);
    setBusy(false);
    flash(`Charges fixes de ${profileLabel(profiles, chargesProfile)} réinitialisées.`);
  }

  async function handleRazBudgetsCategories() {
    if (!confirm("Remettre à 0 le budget max de TOUTES les catégories (pour tous les profils, c'est un réglage commun au foyer) ? Cette action est irréversible.")) return;
    setBusy(true);
    await supabase.from("categories").update({ budget_max: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");
    setBusy(false);
    flash("Budgets max des catégories réinitialisés à 0€.");
  }

  if (loading) return <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Prénoms des profils et réinitialisations" />

      {message && (
        <div className="card p-3 mb-5 bg-emerald-soft border-emerald/30 text-emerald text-sm font-medium">
          {message}
        </div>
      )}

      {/* Prénoms */}
      <div className="card p-6 mb-6">
        <h2 className="font-display font-bold text-lg mb-1">Prénoms des profils</h2>
        <p className="text-xs text-ink/50 dark:text-porcelain/50 mb-4">
          Le libellé affiché partout dans l'appli (ex : "P1 - {prenoms.profil1 || "..."}") suit automatiquement ce prénom.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil 1 (P1)</label>
            <div className="flex gap-2 mt-1">
              <input type="text" className="input" value={prenoms.profil1}
                onChange={(e) => setPrenoms({ ...prenoms, profil1: e.target.value })} />
              <button disabled={busy} className="btn-primary shrink-0" onClick={() => handleSavePrenom("profil1")}>OK</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil 2 (P2)</label>
            <div className="flex gap-2 mt-1">
              <input type="text" className="input" value={prenoms.profil2}
                onChange={(e) => setPrenoms({ ...prenoms, profil2: e.target.value })} />
              <button disabled={busy} className="btn-primary shrink-0" onClick={() => handleSavePrenom("profil2")}>OK</button>
            </div>
          </div>
        </div>
      </div>

      {/* RAZ transactions */}
      <div className="card p-6 mb-6 border-coral/30">
        <h2 className="font-display font-bold text-lg mb-1">Réinitialiser les mouvements</h2>
        <p className="text-xs text-ink/50 dark:text-porcelain/50 mb-4">
          Supprime les revenus et dépenses d'un profil pour un mois donné (utile après un mois de test). N'affecte pas les charges fixes ni les budgets par catégorie.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil</label>
            <select className="input mt-1 !w-auto" value={razProfile} onChange={(e) => setRazProfile(e.target.value)}>
              <option value="profil1">{profileLabel(profiles, "profil1")}</option>
              <option value="profil2">{profileLabel(profiles, "profil2")}</option>
              <option value="commun">Commun</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Mois</label>
            <select className="input mt-1 !w-auto" value={razMonth} onChange={(e) => setRazMonth(Number(e.target.value))}>
              {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Année</label>
            <select className="input mt-1 !w-auto" value={razYear} onChange={(e) => setRazYear(Number(e.target.value))}>
              {[razYear - 1, razYear, razYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button disabled={busy} className="btn-danger" onClick={handleRazTransactions}>Réinitialiser ce mois</button>
        </div>
      </div>

      {/* RAZ charges fixes */}
      <div className="card p-6 mb-6 border-coral/30">
        <h2 className="font-display font-bold text-lg mb-1">Réinitialiser les charges fixes</h2>
        <p className="text-xs text-ink/50 dark:text-porcelain/50 mb-4">
          Supprime toutes les charges fixes d'un profil. Séparé de la réinitialisation des mouvements.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil</label>
            <select className="input mt-1 !w-auto" value={chargesProfile} onChange={(e) => setChargesProfile(e.target.value)}>
              <option value="profil1">{profileLabel(profiles, "profil1")}</option>
              <option value="profil2">{profileLabel(profiles, "profil2")}</option>
              <option value="commun">Commun</option>
            </select>
          </div>
          <button disabled={busy} className="btn-danger" onClick={handleRazCharges}>Réinitialiser les charges</button>
        </div>
      </div>

      {/* RAZ budgets catégories */}
      <div className="card p-6 border-coral/30">
        <h2 className="font-display font-bold text-lg mb-1">Réinitialiser les budgets par catégorie</h2>
        <p className="text-xs text-ink/50 dark:text-porcelain/50 mb-4">
          Remet à 0€ le "budget max estimé" de toutes les catégories (réglage commun au foyer, onglet Budgets).
        </p>
        <button disabled={busy} className="btn-danger" onClick={handleRazBudgetsCategories}>Réinitialiser les budgets catégories</button>
      </div>
    </div>
  );
}
