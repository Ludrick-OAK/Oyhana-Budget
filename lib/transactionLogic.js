import { supabase } from "@/lib/supabaseClient";

// Construit la transaction miroir correspondant à une transaction interne.
function buildMirror(tx) {
  return {
    profile_id: tx.contrepartie_profile_id,
    type: tx.type === "depense" ? "revenu" : "depense",
    montant: tx.montant,
    category_id: tx.category_id || null,
    description: tx.description || null,
    date: tx.date,
    contrepartie_profile_id: tx.profile_id,
  };
}

// Crée une transaction, et si elle est interne (contrepartie renseignée), crée aussi son miroir et lie les deux.
export async function createTransaction(payload) {
  const { data: original, error: err1 } = await supabase.from("transactions").insert(payload).select().single();
  if (err1) throw err1;

  if (payload.contrepartie_profile_id) {
    const mirrorPayload = { ...buildMirror(original), linked_transaction_id: original.id };
    const { data: mirror, error: err2 } = await supabase.from("transactions").insert(mirrorPayload).select().single();
    if (err2) throw err2;
    await supabase.from("transactions").update({ linked_transaction_id: mirror.id }).eq("id", original.id);
  }
}

// Met à jour une transaction. Si elle a (ou avait) un miroir, celui-ci est supprimé et recréé
// pour rester cohérent avec les nouvelles valeurs (montant, catégorie, date, contrepartie...).
export async function updateTransaction(id, payload, previousLinkedId) {
  if (previousLinkedId) {
    await supabase.from("transactions").delete().eq("id", previousLinkedId);
  }
  const { data: updated, error: err1 } = await supabase
    .from("transactions")
    .update({ ...payload, linked_transaction_id: null })
    .eq("id", id)
    .select()
    .single();
  if (err1) throw err1;

  if (payload.contrepartie_profile_id) {
    const mirrorPayload = { ...buildMirror(updated), linked_transaction_id: updated.id };
    const { data: mirror, error: err2 } = await supabase.from("transactions").insert(mirrorPayload).select().single();
    if (err2) throw err2;
    await supabase.from("transactions").update({ linked_transaction_id: mirror.id }).eq("id", updated.id);
  }
}

// Supprime une transaction et son éventuel miroir.
export async function deleteTransaction(tx) {
  if (tx.linked_transaction_id) {
    await supabase.from("transactions").delete().eq("id", tx.linked_transaction_id);
  }
  await supabase.from("transactions").delete().eq("id", tx.id);
}
