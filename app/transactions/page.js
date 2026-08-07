"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatEuro, profileLabel, profileLabelMap, contrepartieOptions } from "@/lib/helpers";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/transactionLogic";
import { PageHeader, Modal, EmptyState } from "@/components/UI";
import ProfileTabs from "@/components/ProfileTabs";
import { useAuth } from "@/components/AuthProvider";

function emptyForm() {
  return {
    id: null, profile_id: "profil1", type: "depense", montant: "", category_id: "",
    description: "", date: new Date().toISOString().slice(0, 10),
    contrepartie_profile_id: null, linked_transaction_id: null,
  };
}

export default function TransactionsPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const filtered = useMemo(
    () => transactions.filter((t) => profile === "all" || t.profile_id === profile),
    [transactions, profile]
  );

  const options = useMemo(
    () => contrepartieOptions(profiles, form.profile_id, form.type),
    [profiles, form.profile_id, form.type]
  );

  function openNew() {
    setForm(emptyForm());
    setModalOpen(true);
  }
  function openEdit(t) {
    setForm({
      id: t.id, profile_id: t.profile_id, type: t.type, montant: String(t.montant),
      category_id: t.category_id || "", description: t.description || "", date: t.date,
      contrepartie_profile_id: t.contrepartie_profile_id, linked_transaction_id: t.linked_transaction_id,
    });
    setModalOpen(true);
  }

  // Quand on change le profil ou le type, la contrepartie par défaut change aussi (Externe, sauf Commun/revenu -> Profil 1).
  function handleProfileChange(profile_id) {
    const opts = contrepartieOptions(profiles, profile_id, form.type);
    setForm({ ...form, profile_id, contrepartie_profile_id: opts[0].value });
  }
  function handleTypeChange(type) {
    const opts = contrepartieOptions(profiles, form.profile_id, type);
    setForm({ ...form, type, contrepartie_profile_id: opts[0].value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      profile_id: form.profile_id,
      type: form.type,
      montant: Number(form.montant),
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
      contrepartie_profile_id: form.contrepartie_profile_id || null,
    };
    try {
      if (form.id) {
        await updateTransaction(form.id, payload, form.linked_transaction_id);
      } else {
        await createTransaction(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(t) {
    const msg = t.linked_transaction_id
      ? "Supprimer ce mouvement ? L'écriture miroir liée sera aussi supprimée."
      : "Supprimer ce mouvement ?";
    if (!confirm(msg)) return;
    await deleteTransaction(t);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Revenus & dépenses"
        subtitle="Ajoutez, modifiez ou supprimez vos mouvements"
        action={<button className="btn-primary" onClick={openNew}>+ Ajouter un mouvement</button>}
      />

      <div className="mb-5">
        <ProfileTabs value={profile} onChange={setProfile} includeAll profiles={profiles} />
      </div>

      {loading ? (
        <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Aucun mouvement pour l'instant." />
      ) : (
        <div className="card overflow-hidden">
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-line dark:border-ink-soft">
                    <td className="px-4 py-3">{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">{labels[t.profile_id]}</td>
                    <td className="px-4 py-3">{categoryById[t.category_id] || "—"}</td>
                    <td className="px-4 py-3">
                      {t.contrepartie_profile_id ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-soft text-violet font-medium">
                          {t.type === "depense" ? "→ " : "← "}{labels[t.contrepartie_profile_id]}
                        </span>
                      ) : (
                        <span className="text-xs text-ink/30 dark:text-porcelain/30">Externe</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/60 dark:text-porcelain/60">{t.description || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === "revenu" ? "text-emerald" : "text-coral"}`}>
                      {t.type === "revenu" ? "+" : "-"}{formatEuro(t.montant)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(t)} className="text-xs text-ink/50 hover:text-ink dark:text-porcelain/50 dark:hover:text-porcelain mr-3">Modifier</button>
                      <button onClick={() => handleDelete(t)} className="text-xs text-coral">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Modifier le mouvement" : "Nouveau mouvement"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => handleTypeChange("depense")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${form.type === "depense" ? "bg-coral text-white" : "bg-cloud dark:bg-ink-soft"}`}>
              Dépense
            </button>
            <button type="button" onClick={() => handleTypeChange("revenu")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${form.type === "revenu" ? "bg-emerald text-ink" : "bg-cloud dark:bg-ink-soft"}`}>
              Revenu
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil</label>
            <select className="input mt-1" value={form.profile_id} onChange={(e) => handleProfileChange(e.target.value)}>
              <option value="profil1">{profileLabel(profiles, "profil1")}</option>
              <option value="profil2">{profileLabel(profiles, "profil2")}</option>
              <option value="commun">Commun</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">
              {form.type === "depense" ? "Destination (où va l'argent)" : "Source (d'où vient l'argent)"}
            </label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {options.map((opt) => (
                <button key={String(opt.value)} type="button"
                  onClick={() => setForm({ ...form, contrepartie_profile_id: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                    ${form.contrepartie_profile_id === opt.value
                      ? "bg-violet text-white border-violet"
                      : "bg-white dark:bg-ink border-line dark:border-ink-soft text-ink/60 dark:text-porcelain/60"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.contrepartie_profile_id && (
              <p className="text-xs text-violet mt-1.5">
                Une écriture miroir sera créée automatiquement chez {profileLabel(profiles, form.contrepartie_profile_id)}.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Montant (€)</label>
            <input type="number" step="0.01" min="0" required className="input mt-1" value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })} />
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Catégorie</label>
            <select className="input mt-1" value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Date</label>
            <input type="date" required className="input mt-1" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Description (optionnel)</label>
            <input type="text" className="input mt-1" value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
