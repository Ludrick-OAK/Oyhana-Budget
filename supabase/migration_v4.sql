-- =========================================================
-- OYHANA BUDGET — migration v4
-- A exécuter dans Supabase > SQL Editor si tu as déjà exécuté
-- schema.sql / migration_v2.sql / migration_v3.sql. Rejouable sans risque.
-- =========================================================

-- Permet de marquer une charge fixe comme une contribution interne
-- (ex: "Participation loyer commun" de P1 vers Commun), pour qu'elle
-- compte dans le budget personnel du profil qui paie, mais PAS une
-- deuxième fois dans le 50/30/20 (où la charge côté destinataire compte déjà).
alter table fixed_charges add column if not exists contrepartie_profile_id text references profiles(id);
