/**
 * CSV export helper — client-side download, BOM for Excel compatibility.
 *
 * Cells that begin with a formula character (= + - @, and Excel's tab/CR
 * variants) are prefixed with a single quote so user-controlled listing
 * titles, names or notes cannot execute as formulas when the export is
 * opened in Excel / Sheets (CSV formula injection, OWASP guidance).
 */
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
