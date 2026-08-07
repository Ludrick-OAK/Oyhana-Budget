-- =========================================================
-- OYHANA BUDGET — migration v3
-- A exécuter dans Supabase > SQL Editor si tu as déjà exécuté
-- schema.sql et/ou migration_v2.sql. Rejouable sans risque.
-- =========================================================

-- Permet d'associer une catégorie à chaque charge fixe, pour qu'elle soit
-- comptabilisée dans l'analyse par catégorie et dans la règle 50/30/20.
alter table fixed_charges add column if not exists category_id uuid references categories(id) on delete set null;
