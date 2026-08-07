-- =========================================================
-- OYHANA BUDGET — schema Supabase (PostgreSQL)
-- A coller dans Supabase > SQL Editor > New query > Run
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILS (3 espaces fixes) ----------
create table if not exists profiles (
  id text primary key,                 -- 'profil1' | 'profil2' | 'commun'
  prenom text not null,
  budget_mensuel numeric(10,2) default 0,
  created_at timestamptz default now()
);

insert into profiles (id, prenom) values
  ('profil1', 'Profil 1'),
  ('profil2', 'Profil 2'),
  ('commun',  'Commun')
on conflict (id) do nothing;

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  groupe text check (groupe is null or groupe in ('besoins', 'envies', 'epargne')),
  budget_max numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

insert into categories (nom, groupe) values
  ('Alimentation', 'besoins'), ('Restaurant', 'envies'), ('Achats', 'envies'), ('Shopping', 'envies'),
  ('Assurances', 'besoins'), ('Transport', 'besoins'), ('Entretien véhicules', 'besoins'), ('Essence véhicules', 'besoins'),
  ('Loisirs', 'envies'), ('Divertissement', 'envies'), ('Épargne', 'epargne'), ('Logement', 'besoins'),
  ('Santé', 'besoins'), ('Impôts', 'besoins'), ('Salaire', null), ('Cosmétiques', 'envies')
on conflict (nom) do nothing;

-- ---------- TRANSACTIONS (revenus & dépenses) ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  type text not null check (type in ('revenu', 'depense')),
  montant numeric(10,2) not null check (montant >= 0),
  category_id uuid references categories(id) on delete set null,
  description text,
  date date not null default current_date,
  contrepartie_profile_id text references profiles(id),
  linked_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_profile on transactions(profile_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category on transactions(category_id);

-- ---------- CHARGES FIXES ----------
create table if not exists fixed_charges (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  nom text not null,
  montant numeric(10,2) not null check (montant >= 0),
  category_id uuid references categories(id) on delete set null,
  -- Si renseigné : cette charge est une contribution interne vers un autre profil (ex: "Participation loyer
  -- commun" de P1 vers Commun). Elle compte dans le budget personnel du payeur, mais pas dans le 50/30/20
  -- (pour éviter de compter deux fois le même argent avec la charge correspondante côté destinataire).
  contrepartie_profile_id text references profiles(id),
  created_at timestamptz default now()
);

insert into fixed_charges (profile_id, nom, montant, category_id, contrepartie_profile_id) values
  ('profil1', 'Prêt voiture', 258, (select id from categories where nom = 'Transport'), null),
  ('profil1', 'Assurance vie', 8, (select id from categories where nom = 'Assurances'), null),
  ('profil1', 'Participation loyer commun', 500, (select id from categories where nom = 'Logement'), 'commun'),
  ('profil2', 'Prêt', 298, null, null),
  ('profil2', 'Assurance voiture', 90, (select id from categories where nom = 'Assurances'), null),
  ('profil2', 'Participation loyer commun', 610, (select id from categories where nom = 'Logement'), 'commun'),
  ('profil2', 'Forfait téléphonique', 43, null, null),
  ('profil2', 'Pass Navigo', 60, (select id from categories where nom = 'Transport'), null),
  ('commun',  'Loyer', 1069, (select id from categories where nom = 'Logement'), null),
  ('commun',  'Assurance loyer', 25, (select id from categories where nom = 'Logement'), null),
  ('commun',  'Salle de sport', 32, (select id from categories where nom = 'Loisirs'), null),
  ('commun',  'Netflix', 25, (select id from categories where nom = 'Divertissement'), null)
on conflict do nothing;

-- =========================================================
-- SECURITE (RLS) — accès réservé aux utilisateurs connectés
-- (application à 2 personnes : tout utilisateur authentifié
-- peut lire/écrire l'ensemble des données, puisqu'elles sont
-- partagées entre les deux comptes).
-- =========================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table fixed_charges enable row level security;

create policy "profiles_all_authenticated" on profiles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "categories_all_authenticated" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "transactions_all_authenticated" on transactions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "fixed_charges_all_authenticated" on fixed_charges
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
