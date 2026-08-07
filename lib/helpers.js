export function formatEuro(value) {
  const n = Number(value || 0);
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function monthBounds(year, month) {
  // month: 1-12
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function yearBounds(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function budgetStatus(consumedPct) {
  if (consumedPct >= 100) return { color: "coral", label: "Dépassé" };
  if (consumedPct >= 80) return { color: "amber", label: "Proche de la limite" };
  return { color: "emerald", label: "Respecté" };
}

const PROFILE_PREFIX = { profil1: "P1", profil2: "P2", commun: null };

// Construit le libellé d'un profil à partir de son prénom en base (ex: "P1 - Toto", "Commun").
export function profileLabel(profiles, profileId) {
  const p = (profiles || []).find((pr) => pr.id === profileId);
  const prenom = p?.prenom || profileId;
  if (profileId === "commun") return "Commun";
  const prefix = PROFILE_PREFIX[profileId];
  return prefix ? `${prefix} - ${prenom}` : prenom;
}

export function profileLabelMap(profiles) {
  const map = {};
  (profiles || []).forEach((p) => (map[p.id] = profileLabel(profiles, p.id)));
  return map;
}

// Options de contrepartie (destination pour une dépense, source pour un revenu) selon le profil courant.
// "externe" = null en base. L'ordre reflète l'option cochée par défaut.
export function contrepartieOptions(profiles, currentProfileId, type) {
  const label = (id) => (id === null ? "Externe" : profileLabel(profiles, id));
  if (currentProfileId === "commun") {
    if (type === "revenu") {
      return [
        { value: "profil1", label: label("profil1") },
        { value: "profil2", label: label("profil2") },
        { value: null, label: "Externe" },
      ];
    }
    return [
      { value: null, label: "Externe" },
      { value: "profil1", label: label("profil1") },
      { value: "profil2", label: label("profil2") },
    ];
  }
  const other = currentProfileId === "profil1" ? "profil2" : "profil1";
  return [
    { value: null, label: "Externe" },
    { value: other, label: label(other) },
    { value: "commun", label: "Commun" },
  ];
}

export const GROUPE_LABELS = {
  besoins: "Besoins essentiels",
  envies: "Envies",
  epargne: "Épargne & Projets d'avenir",
};

export const GROUPE_TARGET_PCT = {
  besoins: 0.5,
  envies: 0.3,
  epargne: 0.2,
};

export const CHART_COLORS = [
  "#00C48C", "#FF6B5D", "#FFB020", "#6C63FF",
  "#00A8CC", "#F45B69", "#8D6A9F", "#2EC4B6",
  "#FF8FA3", "#4C6EF5", "#40C057", "#FAB005",
  "#E64980", "#15AABF", "#845EF7", "#FF922B",
];

export function toCSV(rows, columns) {
  const header = columns.map((c) => c.label).join(";");
  const lines = rows.map((row) =>
    columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(";")
  );
  return [header, ...lines].join("\n");
}

export function downloadFile(filename, content, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
