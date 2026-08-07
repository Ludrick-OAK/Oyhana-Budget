"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatEuro, profileLabelMap, toCSV, downloadFile } from "@/lib/helpers";
import { exportNodeAsImage, exportRowsAsXLSX, exportRowsAsPDF } from "@/lib/exportUtils";
import { PageHeader, EmptyState } from "@/components/UI";
import { useAuth } from "@/components/AuthProvider";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function HistoriquePage() {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("all");
  const [profile, setProfile] = useState("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("categories").select("*").order("nom"),
      supabase.from("profiles").select("*").order("id"),
    ]);
    setTransactions(t || []);
    setCategories(c || []);
    setProfiles(p || []);
    setLoading(false);
  }

  useEffect(() => { if (session) load(); }, [session]);

  const labels = useMemo(() => profileLabelMap(profiles), [profiles]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c.nom));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() !== year) return false;
      if (month !== "all" && d.getMonth() + 1 !== Number(month)) return false;
      if (profile !== "all" && t.profile_id !== profile) return false;
      if (category !== "all" && t.category_id !== category) return false;
      if (type !== "all" && t.type !== type) return false;
      return true;
    });
  }, [transactions, year, month, profile, category, type]);

  const totals = useMemo(() => {
    const revenus = filtered.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
    const depenses = filtered.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0);
    return { revenus, depenses, solde: revenus - depenses };
  }, [filtered]);

  function buildExportRows() {
    return filtered.map((t) => ({
      date: new Date(t.date).toLocaleDateString("fr-FR"),
      profil: labels[t.profile_id],
      type: t.type === "revenu" ? "Revenu" : "Dépense",
      categorie: categoryById[t.category_id] || "",
      lien: t.contrepartie_profile_id ? labels[t.contrepartie_profile_id] : "Externe",
      description: t.description || "",
      montant: t.montant,
    }));
  }

  const columns = [
    { key: "date", label: "Date" },
    { key: "profil", label: "Profil" },
    { key: "type", label: "Type" },
    { key: "categorie", label: "Catégorie" },
    { key: "lien", label: "Lien" },
    { key: "description", label: "Description" },
    { key: "montant", label: "Montant (€)" },
  ];

  function exportCSV() {
    const csv = toCSV(buildExportRows(), columns);
    downloadFile(`oyhana-historique-${year}.csv`, csv, "text/csv;charset=utf-8;");
  }

  async function exportXLSX() {
    setExporting(true);
    try {
      await exportRowsAsXLSX(buildExportRows(), columns, `oyhana-historique-${year}.xlsx`);
    } catch (err) {
      alert("Export impossible : " + err.message);
    }
    setExporting(false);
  }

  async function exportPDF() {
    setExporting(true);
    try {
      await exportRowsAsPDF(buildExportRows(), columns, `oyhana-historique-${year}.pdf`, `Historique ${year}`);
    } catch (err) {
      alert("Export impossible : " + err.message);
    }
    setExporting(false);
  }

  async function exportImage() {
    setExporting(true);
    try {
      await exportNodeAsImage(tableRef.current, `oyhana-historique-${year}.png`);
    } catch (err) {
      alert("Export impossible : " + err.message);
    }
    setExporting(false);
  }

  return (
    <div>
      <PageHeader
        title="Historique"
        subtitle="Consultez et exportez vos mouvements par période"
        action={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-ghost" onClick={exportImage} disabled={exporting}>Image</button>
            <button className="btn-ghost" onClick={exportCSV} disabled={exporting}>CSV</button>
            <button className="btn-ghost" onClick={exportXLSX} disabled={exporting}>Excel</button>
            <button className="btn-primary" onClick={exportPDF} disabled={exporting}>PDF</button>
          </div>
        }
      />

      <div className="card p-4 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">Tous les mois</option>
          {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={profile} onChange={(e) => setProfile(e.target.value)}>
          <option value="all">Tous les profils</option>
          <option value="profil1">{labels.profil1}</option>
          <option value="profil2">{labels.profil2}</option>
          <option value="commun">Commun</option>
        </select>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Revenus & dépenses</option>
          <option value="revenu">Revenus uniquement</option>
          <option value="depense">Dépenses uniquement</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs text-ink/50 dark:text-porcelain/50">Revenus</p>
          <p className="font-display font-bold text-emerald mt-1">{formatEuro(totals.revenus)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink/50 dark:text-porcelain/50">Dépenses</p>
          <p className="font-display font-bold text-coral mt-1">{formatEuro(totals.depenses)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink/50 dark:text-porcelain/50">Solde</p>
          <p className={`font-display font-bold mt-1 ${totals.solde >= 0 ? "text-emerald" : "text-coral"}`}>{formatEuro(totals.solde)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Aucun mouvement pour cette période." />
      ) : (
        <div ref={tableRef} className="card overflow-hidden bg-white dark:bg-ink-light">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cloud dark:bg-ink-soft text-ink/50 dark:text-porcelain/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Profil</th>
                  <th className="text-left px-4 py-3">Catégorie</th>
                  <th className="text-left px-4 py-3">Lien</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-right px-4 py-3">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-line dark:border-ink-soft">
                    <td className="px-4 py-3">{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">{labels[t.profile_id]}</td>
                    <td className="px-4 py-3">{categoryById[t.category_id] || "—"}</td>
                    <td className="px-4 py-3">{t.contrepartie_profile_id ? labels[t.contrepartie_profile_id] : "Externe"}</td>
                    <td className="px-4 py-3 text-ink/60 dark:text-porcelain/60">{t.description || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === "revenu" ? "text-emerald" : "text-coral"}`}>
                      {t.type === "revenu" ? "+" : "-"}{formatEuro(t.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
