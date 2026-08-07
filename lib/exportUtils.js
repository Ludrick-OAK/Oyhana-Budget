// Toutes les librairies d'export sont chargées dynamiquement (import() côté client uniquement)
// pour ne pas alourdir le chargement initial de l'application.

export async function exportNodeAsImage(node, filename) {
  if (!node) throw new Error("Élément introuvable.");
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportRowsAsXLSX(rows, columns, filename, sheetName = "Historique") {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => {
    const obj = {};
    columns.forEach((c) => (obj[c.label] = r[c.key]));
    return obj;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export async function exportRowsAsPDF(rows, columns, filename, title) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 15);
  }
  autoTable(doc, {
    startY: title ? 20 : 10,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 41] },
  });
  doc.save(filename);
}
