// src/components/vencimientos/VencimientosExportModal.jsx
import React, { useMemo, useState } from "react";
import { FaFileExport, FaTimes, FaSpinner, FaFileExcel, FaFilePdf, FaFilter, FaEye } from "react-icons/fa";

// ====== helpers API (mismos que usabas) ======
const RAW_BASE = (import.meta.env.VITE_API_URL || "").toString().trim();

function normalizeApiRoot(rawBase) {
  if (!rawBase) return "/api";
  let base = rawBase;
  if (!/^https?:\/\//i.test(base) && !base.startsWith("/")) base = `http://${base}`;
  base = base.endsWith("/") ? base : `${base}/`;
  if (/\/api\/$/i.test(base)) return base.replace(/\/api\/$/i, "/api");
  if (/\/api$/i.test(base)) return base.replace(/\/api$/i, "/api");
  return `${base.replace(/\/$/, "")}/api`;
}
const API_ROOT = normalizeApiRoot(RAW_BASE);

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.keys(params)
    .sort()
    .forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      sp.append(k, String(v));
    });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function joinUrl(root, path) {
  const r = (root || "").toString().trim();
  const p = (path || "").toString().trim();
  if (!r) return p;
  if (p.startsWith("/api/")) return `${r}${p.replace(/^\/api/, "")}`;
  if (p.startsWith("/")) return `${r}${p}`;
  return `${r}/${p}`;
}

async function apiGetJson(urlOrPath, params = null) {
  const url =
    params && typeof urlOrPath === "string"
      ? `${joinUrl(API_ROOT, urlOrPath)}${buildQuery(params)}`
      : urlOrPath;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed (${res.status}): ${txt}`);
  }
  return res.json();
}

// ====== export helpers ======
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// construir tabla html (excel)
function htmlTableExcel(title, headers, rows) {
  const thead = `<tr>${headers.map((h) => `<th style="border:1px solid #999;padding:6px;background:#eee">${escapeHtml(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map(
      (r) =>
        `<tr>${r
          .map((c) => `<td style="border:1px solid #999;padding:6px">${escapeHtml(c)}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <h3>${escapeHtml(title)}</h3>
  <table style="border-collapse:collapse;font-family:Arial;font-size:12px">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
}

// pdf printable
function htmlPrintable(title, subtitle, headers, rows) {
  const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
  h2 { margin: 0 0 6px 0; }
  .sub { margin: 0 0 12px 0; color: #444; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #999; padding: 6px; vertical-align: top; }
  th { background: #f2f2f2; }
</style>
</head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <div class="sub">${escapeHtml(subtitle)}</div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
}

function buildScopeParams(scope, context, currentParams) {
  const base = {
    oficina: context.oficina || undefined,
    search: context.search || undefined,
    include_finalizadas: context.includeFinalizadas ? 1 : undefined,
    fecha: context.baseDate || undefined,
    ordering: currentParams.ordering,
    page: 1,
    page_size: 200,
  };

  if (scope === "actual") {
    return {
      ...base,
      modo: currentParams.modo,
      past_days: currentParams.past_days,
      future_days: currentParams.future_days,
    };
  }

  if (scope === "vencidas") return { ...base, modo: "vencidas", past_days: 30, future_days: 0 };
  if (scope === "hoy") return { ...base, modo: "hoy", past_days: 0, future_days: 0 };
  if (scope === "por_vencer") return { ...base, modo: "por_vencer", past_days: 0, future_days: 3 };

  if (scope === "custom") {
    return {
      ...base,
      modo: "all",
      past_days: Number(context.customPastDays ?? 0),
      future_days: Number(context.customFutureDays ?? 0),
    };
  }

  return { ...base, modo: currentParams.modo };
}

async function fetchAllPolizas(params) {
  const first = await apiGetJson("/polizas/vencimientos/", params);
  const all = [];
  const r1 = Array.isArray(first?.results) ? first.results : Array.isArray(first) ? first : [];
  all.push(...r1);

  let next = first?.next || null;
  while (next) {
    const pageData = await apiGetJson(next, null);
    const rr = Array.isArray(pageData?.results) ? pageData.results : Array.isArray(pageData) ? pageData : [];
    all.push(...rr);
    next = pageData?.next || null;
  }
  return all;
}

function computeDiasFallbackLocal(p) {
  const raw = p?.dias_para_vencer;
  const d = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(d)) return d;

  const v = p?.vto_referencia || p?.fecha_vencimiento;
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let vtoDate = null;
  if (m) vtoDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  else {
    const d2 = new Date(s);
    if (!Number.isNaN(d2.getTime())) vtoDate = d2;
  }
  if (!vtoDate) return null;
  vtoDate.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ms = vtoDate.getTime() - hoy.getTime();
  return Math.round(ms / 86400000);
}

function fmtVtoLocal(v) {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s.slice(0, 10);
}

function normalizeOficinaStr(o) {
  if (o === null || o === undefined) return "";
  return String(o).trim();
}

function buildAseguradosFromPolizas(polizas) {
  const map = new Map();

  for (const p of polizas) {
    const c = p?.cliente || {};
    const clienteId = p?.cliente_id ?? c?.id ?? null;
    const dni = c?.dni ?? c?.dni_cuit_cuil ?? "";
    const hasKey = !!(clienteId || dni);
    const key = String(clienteId ?? dni ?? `POLIZA_${p?.id ?? "?"}`).trim();
    if (!key) continue;

    const nombreReal = `${c?.apellido || ""}, ${c?.nombre || ""}`.trim().replace(/^, /, "");
    const nombre = hasKey ? nombreReal || "—" : `Asegurado desconocido (póliza #${p?.id ?? "?"})`;

    const tel = (c?.telefono || p?.cliente_telefono || "").toString().trim();
    const ofi = normalizeOficinaStr(p?.oficina);
    const vto = p?.vto_referencia || p?.fecha_vencimiento || null;
    const vtoStr = fmtVtoLocal(vto);
    const dias = computeDiasFallbackLocal(p);

    if (!map.has(key)) {
      map.set(key, {
        key,
        cliente_id: clienteId || "",
        nombre,
        dni: hasKey ? dni : "",
        telefono: tel,
        oficina: ofi,
        polizas_count: 0,
        vencidas: 0,
        hoy: 0,
        por_vencer: 0,
        vto_mas_proximo: vtoStr || "",
        dias_mas_proximo: typeof dias === "number" ? dias : null,
      });
    }

    const row = map.get(key);
    row.polizas_count += 1;

    if (!row.telefono && tel) row.telefono = tel;
    if (!row.oficina && ofi) row.oficina = ofi;

    if (typeof dias === "number") {
      if (dias < 0) row.vencidas += 1;
      else if (dias === 0) row.hoy += 1;
      else row.por_vencer += 1;

      if (row.dias_mas_proximo === null || dias < row.dias_mas_proximo) {
        row.dias_mas_proximo = dias;
        row.vto_mas_proximo = vtoStr || row.vto_mas_proximo;
      }
    } else {
      if (!row.vto_mas_proximo && vtoStr) row.vto_mas_proximo = vtoStr;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const da = a.dias_mas_proximo ?? 999999;
    const db = b.dias_mas_proximo ?? 999999;
    return da - db;
  });
}

export default function VencimientosExportModal({ onClose, currentParams, context, pageData }) {
  const [scope, setScope] = useState("actual"); 
  const [view, setView] = useState("polizas"); 
  const [format, setFormat] = useState("excel"); 
  const [onlyThisPage, setOnlyThisPage] = useState(false);
  const [busy, setBusy] = useState(false);

  const subtitle = useMemo(() => {
    const parts = [];
    parts.push(`Filtro: ${scope === "actual" ? "Actual" : scope}`);
    if (context.oficina) parts.push(`Oficina=${context.oficina}`);
    if (context.search) parts.push(`Search="${context.search}"`);
    if (context.baseDate) parts.push(`Fecha=${context.baseDate}`);
    return parts.join(" • ");
  }, [scope, context.oficina, context.search, context.baseDate]);

  async function handleDownload() {
    try {
      setBusy(true);

      let polizas = [];
      if (onlyThisPage) {
        polizas = pageData.polizas || [];
      } else {
        const p = buildScopeParams(scope, context, currentParams);
        polizas = await fetchAllPolizas(p);
      }

      let title = `Vencimientos_${scope}_${todayStamp()}`;

      if (view === "polizas") {
        const headers = ["Patente", "Póliza", "Asegurado", "Teléfono", "Vto", "Días", "Oficina"];
        const rows = polizas.map((p) => {
          const c = p?.cliente || {};
          const asegurado = `${c?.apellido || ""}, ${c?.nombre || ""}`.trim().replace(/^, /, "") || "—";
          const tel = (c?.telefono || p?.cliente_telefono || "").toString().trim();
          const vto = fmtVtoLocal(p?.vto_referencia || p?.fecha_vencimiento);
          const dias = computeDiasFallbackLocal(p);
          const ofi = normalizeOficinaStr(p?.oficina) || "";
          return [p?.patente || "", p?.numero_poliza || "", asegurado, tel, vto, dias ?? "", ofi];
        });

        if (format === "excel") {
          const html = htmlTableExcel(title, headers, rows);
          downloadBlob(`${title}.xls`, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
        } else {
          const html = htmlPrintable(title, subtitle, headers, rows);
          const w = window.open("", "_blank");
          if (!w) throw new Error("No se pudo abrir la ventana de impresión (bloqueo de popups).");
          w.document.open();
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
        }
        return;
      }

      // Asegurados
      const asegurados = onlyThisPage ? (pageData.asegurados || []) : buildAseguradosFromPolizas(polizas);
      const headers = ["Nombre", "DNI", "Teléfono", "Oficina", "Pólizas", "Vencidas", "Hoy", "Por vencer", "Vto más próximo", "Días más próximo"];
      const rows = asegurados.map((a) => [
        a.nombre || "",
        a.dni || "",
        a.telefono || "",
        a.oficina || "",
        a.polizas_count ?? "",
        a.vencidas ?? "",
        a.hoy ?? "",
        a.por_vencer ?? "",
        a.vto_mas_proximo ?? "",
        a.dias_mas_proximo ?? "",
      ]);

      if (format === "excel") {
        const html = htmlTableExcel(title, headers, rows);
        downloadBlob(`${title}_asegurados.xls`, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
      } else {
        const html = htmlPrintable(`${title} (Asegurados)`, subtitle, headers, rows);
        const w = window.open("", "_blank");
        if (!w) throw new Error("No se pudo abrir la ventana de impresión (bloqueo de popups).");
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
      }
    } catch (e) {
      alert(e?.message || "Error exportando");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <FaFileExport className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Exportar Datos</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{subtitle}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors focus:outline-none"
            disabled={busy}
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Columna Izquierda */}
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 h-full">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                <FaFilter /> Selección
              </label>
              
              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Rango a exportar</span>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer shadow-sm"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    disabled={busy}
                  >
                    <option value="actual">Filtro actual (lo que veo)</option>
                    <option value="vencidas">Solo vencidas completas</option>
                    <option value="hoy">Solo vencen hoy</option>
                    <option value="por_vencer">Solo por vencer</option>
                    <option value="custom">Rango personalizado</option>
                  </select>
                </div>

                <label className="flex items-start gap-2.5 text-sm group cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 cursor-pointer"
                    checked={onlyThisPage}
                    onChange={(e) => setOnlyThisPage(e.target.checked)}
                    disabled={busy}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      Solo esta página (Rápido)
                    </span>
                    {!onlyThisPage && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Descarga todo el historial trayendo página por página.
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 h-full">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                <FaEye /> Formato de salida
              </label>

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Vista de datos</span>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer shadow-sm"
                    value={view}
                    onChange={(e) => setView(e.target.value)}
                    disabled={busy}
                  >
                    <option value="polizas">Listado de Pólizas</option>
                    <option value="asegurados">Listado de Asegurados</option>
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Tipo de archivo</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat("excel")}
                      disabled={busy}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        format === "excel" 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FaFileExcel className={format === "excel" ? "text-emerald-600 dark:text-emerald-400" : ""} /> Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("pdf")}
                      disabled={busy}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        format === "pdf" 
                          ? "bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FaFilePdf className={format === "pdf" ? "text-rose-600 dark:text-rose-400" : ""} /> Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600"
            disabled={busy}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
              format === "excel" 
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-500/30" 
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-500/30"
            } ${busy ? "opacity-75 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
            disabled={busy}
          >
            {busy ? (
              <>
                <FaSpinner className="animate-spin text-lg" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FaFileExport className="text-lg" />
                <span>Descargar {format === 'excel' ? 'Excel' : 'Reporte'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}