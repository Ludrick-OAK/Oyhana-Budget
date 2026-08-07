"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email ou mot de passe incorrect.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-porcelain via-porcelain to-emerald-soft
                     dark:from-ink dark:via-ink dark:to-ink-light px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald to-violet flex items-center justify-center">
            <span className="text-white font-display font-bold">O</span>
          </div>
          <div>
            <p className="font-display font-bold leading-none">Oyhana</p>
            <p className="text-xs text-ink/50 dark:text-porcelain/50">Budget</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h1 className="font-display font-bold text-lg">Connexion</h1>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Email</label>
            <input type="email" required className="input mt-1" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 dark:text-porcelain/60">Mot de passe</label>
            <input type="password" required className="input mt-1" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <p className="text-xs text-ink/40 dark:text-porcelain/40 text-center pt-2">
            Les comptes sont créés depuis le tableau de bord Supabase (Authentication → Add user).
          </p>
        </form>
      </div>
    </div>
  );
}
