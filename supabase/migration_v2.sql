-- =========================================================
-- OYHANA BUDGET — migration v2
-- A exécuter dans Supabase > SQL Editor si tu as DÉJÀ exécuté
-- schema.sql une première fois. Rejouable sans risque.
-- =========================================================

-- ---------- Transactions internes (transferts entre profils) ----------
alter table transactions add column if not exists contrepartie_profile_id text references profiles(id);
alter table transactions add column if not exists linked_transaction_id uuid references transactions(id) on delete set null;

-- ---------- Groupes de catégories (règle 50/30/20) + budget commun ----------
alter table categories add column if not exists groupe text;
alter table categories add column if not exists budget_max numeric(10,2) not null default 0;

alter table categories drop constraint if exists categories_groupe_check;
alter table categories add constraint categories_groupe_check
  check (groupe is null or groupe in ('besoins', 'envies', 'epargne'));

-- Rangement par défaut proposé (modifiable ensuite dans l'onglet Budget)
update categories set groupe = 'besoins' where nom in
  ('Logement', 'Assurances', 'Transport', 'Santé', 'Impôts', 'Essence véhicules', 'Entretien véhicules', 'Alimentation')
  and groupe is null;

update categories set groupe = 'envies' where nom in
  ('Restaurant', 'Achats', 'Shopping', 'Loisirs', 'Divertissement', 'Cosmétiques')
  and groupe is null;

update categories set groupe = 'epargne' where nom in ('Épargne')
  and groupe is null;

-- 'Salaire' reste sans groupe : c'est la base de calcul du 50/30/20, pas une dépense.
