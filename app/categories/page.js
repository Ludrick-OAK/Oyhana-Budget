"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader, Modal, EmptyState } from "@/components/UI";
import { useAuth } from "@/components/AuthProvider";

export default function CategoriesPage() {
  const { session } = useAuth();
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("nom");
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => { if (session) load(); }, [session]);

  function openNew() {
    setEditingId(null);
    setName("");
    setModalOpen(true);
  }
  function openEdit(c) {
    setEditingId(c.id);
    setName(c.nom);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      await supabase.from("categories").update({ nom: name.trim() }).eq("id", editingId);
    } else {
      await supabase.from("categories").insert({ nom: name.trim() });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette catégorie ? Les mouvements associés resteront mais perdront leur catégorie.")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle="Gérez les catégories utilisées pour vos revenus et dépenses"
        action={<button className="btn-primary" onClick={openNew}>+ Nouvelle catégorie</button>}
      />

      {loading ? (
        <p className="text-sm text-ink/50 dark:text-porcelain/50">Chargement...</p>
      ) : categories.length === 0 ? (
        <EmptyState text="Aucune catégorie." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c.id} className="card px-4 py-2 flex items-center gap-3">
              <span className="text-sm font-medium">{c.nom}</span>
              <button onClick={() => openEdit(c)} className="text-xs text-ink/40 hover:text-ink dark:text-porcelain/40 dark:hover:text-porcelain">✎</button>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-coral">✕</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Renommer la catégorie" : "Nouvelle catégorie"}>
        <form onSubmit={handleSave} className="space-y-3">
          <input type="text" required className="input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la catégorie" autoFocus />
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </Modal>
    </div>
  );
}
