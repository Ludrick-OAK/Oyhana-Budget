"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatEuro, profileLabel, contrepartieOptions } from "@/lib/helpers";
import { PageHeader, Modal, EmptyState } from "@/components/UI";
import ProfileTabs from "@/components/ProfileTabs";
import { useAuth } from "@/components/AuthProvider";

function emptyForm(profileId) {
  return { id: null, profile_id: profileId, nom: "", montant: "", category_id: "", contrepartie_profile_id: null };
}

export default function ChargesPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState("profil1");
  const [charges, setCharges] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm("profil1"));
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data }, { data: p }, { data: cat }] = await Promise.all([
      supabase.from("fixed_charges").select("*").order("nom"),
      supabase.from("profiles").select("*").order("id"),
      supabase.from("categories").select("*").order("nom"),
    ]);
    setCharges(data || []);
    setProfiles(p || []);
    setCategories(cat || []);
    setLoading(false);
  }

  useEffect(() => { if (session) load(); }, [session]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c.nom));
    return map;
  }, [categories]);

  const filtered = useMemo(() => charges.filter((c) => c.profile_id === profile), [charges, profile]);
  const total = useMemo(() => filtered.reduce((s, c) => s + Number(c.montant), 0), [filtered]);
  const sansCategorie = useMemo(() => filtered.filter((c) => !c.category_id).length, [filtered]);

  const options = useMemo(
    () => contrepartieOptions(profiles, form.profile_id, "depense"),
    [profiles, form.profile_id]
  );

  function openNew() {
    setForm(emptyForm(profile));
    setModalOpen(true);
  }
  function openEdit(c) {
    setForm({ ...c, montant: String(c.montant), category_id: c.category_id || "" });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      profile_id: form.profile_id,
      nom: form.nom,
      montant: Number(form.montant),
      category_id: form.category_id || null,
      contrepartie_profile_id: form.contrepartie_profile_id || null,
    };
    if (form.id) {
      await supabase.from("fixed_charges").update(payload).eq("id", form.id);
    } else {
      await supabase.from("fixed_charges").insert(payload);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette charge fixe ?")) return;
    await supabase.from("fixed_charges").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Charges fixes"
        subtitle="Loyer, assurances, abonnements... par espace"
        action={<button className="btn-primary" onClick={openNew}>+ Ajouter une charge</button>}
      />

      <div className="mb-5">
        <ProfileTabs value={profile} onChange={setProfile} profiles={profiles} />
      </div>

      <div className="card p-5 mb-5 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-ink/60 dark:text-porcelain/60">Total mensuel des charges fixes</p>
        <p className="font-display font-bold text-xl text-coral">{formatEuro(total)}</p>
      </div>

      {sansCategorie > 0 && (
        <div className="card p-3 mb-5 bg-amber-soft border-amber/30 text-sm text-amber">
          {sansCategorie} charge{sansCategorie > 1 ? "s" : ""} sans catégorie — elle{sansCategorie > 1 ? "s" : ""} ne
          {sansCategorie > 1 ? " seront" : " sera"} pas comptabilisée{sansCategorie > 1 ? "s" : ""} dans l'analyse par catégorie
          de l'onglet Budgets. Ajoute une catégorie (✎) pour corriger ça.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Aucune charge fixe pour ce profil." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.nom}</p>
                <p className="text-xs text-ink/40 dark:text-porcelain/40 mt-0.5">{formatEuro(c.montant)} / mois</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {c.category_id ? (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-cloud dark:bg-ink-soft text-ink/60 dark:text-porcelain/60">
                      {categoryById[c.category_id]}
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-soft text-amber">
                      Sans catégorie
                    </span>
                  )}
                  {c.contrepartie_profile_id && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-violet-soft text-violet">
                      → {profileLabel(profiles, c.contrepartie_profile_id)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button onClick={() => openEdit(c)} className="text-xs text-ink/50 hover:text-ink dark:text-porcelain/50 dark:hover:text-porcelain">✎</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-coral">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Modifier la charge" : "Nouvelle charge fixe"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Profil</label>
            <select className="input mt-1" value={form.profile_id}
              onChange={(e) => setForm({ ...form, profile_id: e.target.value, contrepartie_profile_id: null })}>
              <option value="profil1">{profileLabel(profiles, "profil1")}</option>
              <option value="profil2">{profileLabel(profiles, "profil2")}</option>
              <option value="commun">Commun</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Nom de la charge</label>
            <input type="text" required className="input mt-1" value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Loyer, Netflix..." />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Montant mensuel (€)</label>
            <input type="number" step="0.01" min="0" required className="input mt-1" value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Catégorie</label>
            <select className="input mt-1" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Contribution interne (optionnel)</label>
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
            <p className="text-xs text-ink/40 dark:text-porcelain/40 mt-1.5">
              À cocher uniquement si cette charge est en fait un versement vers un autre profil (ex : "Participation loyer commun").
              Elle comptera dans le budget personnel de {profileLabel(profiles, form.profile_id)}, mais pas une 2e fois dans le 50/30/20
              (la charge équivalente côté destinataire compte déjà).
            </p>
          </div>

          <button type="submit" className="btn-primary w-full mt-2">Enregistrer</button>
        </form>
      </Modal>
    </div>
  );
}
