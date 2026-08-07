"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { formatEuro, CHART_COLORS, profileLabel } from "@/lib/helpers";
import { PageHeader, StatCard, EmptyState } from "@/components/UI";
import { useAuth } from "@/components/AuthProvider";
import { exportNodeAsImage } from "@/lib/exportUtils";

const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

export default function DashboardPage() {
  const { session } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [view, setView] = useState("mensuel");

  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef(null);

  async function handleExportImage() {
    setExporting(true);
    try {
      await exportNodeAsImage(captureRef.current, `oyhana-dashboard-${year}-${month}.png`);
    } catch (err) {
      alert("Export impossible : " + err.message);
    }
    setExporting(false);
  }

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: c }, { data: t }, { data: fc }] = await Promise.all([
        supabase.from("profiles").select("*").order("id"),
        supabase.from("categories").select("*").order("nom"),
        supabase.from("transactions").select("*").gte("date", `${year}-01-01`).lte("date", `${year}-12-31`),
        supabase.from("fixed_charges").select("*"),
      ]);
      setProfiles(p || []);
      setCategories(c || []);
      setTransactions(t || []);
      setCharges(fc || []);
      setLoading(false);
    })();
  }, [session, year]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c.nom));
    return map;
  }, [categories]);

  const monthlyFixedTotal = useMemo(
    () => charges.reduce((sum, c) => sum + Number(c.montant), 0),
    [charges]
  );

  const monthTx = useMemo(
    () => transactions.filter((t) => new Date(t.date).getMonth() + 1 === month),
    [transactions, month]
  );

  const stats = useMemo(() => {
    const compute = (txs, includeFixed) => {
      const revenus = txs.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
      const depensesVar = txs.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0);
      const depensesFixes = includeFixed ? monthlyFixedTotal * includeFixed : 0;
      const depenses = depensesVar + depensesFixes;
      const epargne = revenus - depenses;
      return { revenus, depenses, epargne, solde: epargne };
    };
    return {
      mensuel: compute(monthTx, 1),
      annuel: compute(transactions, 12),
    };
  }, [monthTx, transactions, monthlyFixedTotal]);

  const pieData = useMemo(() => {
    const byCategory = {};
    monthTx.filter((t) => t.type === "depense").forEach((t) => {
      const name = categoryById[t.category_id] || "Sans catégorie";
      byCategory[name] = (byCategory[name] || 0) + Number(t.montant);
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [monthTx, categoryById]);

  const evolutionData = useMemo(() => {
    return MONTHS_FR.map((label, idx) => {
      const m = idx + 1;
      const txs = transactions.filter((t) => new Date(t.date).getMonth() + 1 === m);
      const revenus = txs.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
      const depenses = txs.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0) + monthlyFixedTotal;
      return { mois: label, Revenus: revenus, Dépenses: depenses, Épargne: revenus - depenses };
    });
  }, [transactions, monthlyFixedTotal]);

  const profileBreakdown = useMemo(() => {
    return profiles.map((p) => {
      const txs = monthTx.filter((t) => t.profile_id === p.id);
      const revenus = txs.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
      const fixed = charges.filter((c) => c.profile_id === p.id).reduce((s, c) => s + Number(c.montant), 0);
      const depenses = txs.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0) + fixed;
      return { ...p, revenus, depenses, solde: revenus - depenses };
    });
  }, [profiles, monthTx, charges]);

  const current = stats[view === "mensuel" ? "mensuel" : "annuel"];

  if (loading) {
    return <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos finances, Profil 1, Profil 2 et Commun"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn-ghost" onClick={handleExportImage} disabled={exporting}>
              {exporting ? "Export..." : "Exporter en image"}
            </button>
            <select className="input !w-auto" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="mensuel">Vue mensuelle</option>
              <option value="annuel">Vue annuelle</option>
            </select>
            {view === "mensuel" && (
              <select className="input !w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            )}
            <select className="input !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      <div ref={captureRef} className="bg-porcelain dark:bg-ink p-1">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenus" value={formatEuro(current.revenus)} tone="emerald" />
        <StatCard label="Dépenses" value={formatEuro(current.depenses)} tone="coral" />
        <StatCard label="Épargne" value={formatEuro(current.epargne)} tone="violet" />
        <StatCard label="Solde restant" value={formatEuro(current.solde)}
          tone={current.solde >= 0 ? "emerald" : "coral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {profileBreakdown.map((p) => (
          <div key={p.id} className="card p-5">
            <p className="text-xs font-semibold text-ink/50 dark:text-porcelain/50 uppercase tracking-wide">{profileLabel(profiles, p.id)}</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-sm text-ink/60 dark:text-porcelain/60">Solde du mois</span>
              <span className={`font-display font-bold ${p.solde >= 0 ? "text-emerald" : "text-coral"}`}>
                {formatEuro(p.solde)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-ink/40 dark:text-porcelain/40 mt-1">
              <span>+{formatEuro(p.revenus)}</span>
              <span>-{formatEuro(p.depenses)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <h3 className="font-display font-semibold mb-4">Dépenses par catégorie — {MONTHS_FR[month - 1]}</h3>
          {pieData.length === 0 ? <EmptyState text="Aucune dépense ce mois-ci." /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatEuro(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold mb-4">Évolution mensuelle {year}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="mois" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => formatEuro(v)} />
              <Legend />
              <Bar dataKey="Revenus" fill="#00C48C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dépenses" fill="#FF6B5D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Évolution de l'épargne {year}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="mois" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => formatEuro(v)} />
            <Line type="monotone" dataKey="Épargne" stroke="#6C63FF" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
