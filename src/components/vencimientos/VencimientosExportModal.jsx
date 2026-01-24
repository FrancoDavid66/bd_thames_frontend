// src/components/vencimientos/VencimientosExportModal.jsx
import React, { useMemo, useState } from "react";

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
  // base: todo lo del usuario (oficina/search/include_finalizadas/fecha)
  // y según scope forzamos modo / rango
  const base = {
    oficina: context.oficina || undefined,
    search: context.search || undefined,
    include_finalizadas: context.includeFinalizadas ? 1 : undefined,
    fecha: context.baseDate || undefined,
    // ordering seguro:
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

  // rango personalizado
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
  // usa backend dias_para_vencer si viene, si no calcula con vto_referencia/fecha_vencimiento
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
  const [scope, setScope] = useState("actual"); // actual | vencidas | hoy | por_vencer | custom
  const [view, setView] = useState("polizas"); // polizas | asegurados
  const [format, setFormat] = useState("excel"); // excel | pdf
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

      // construir filas
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

      // asegurados
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="text-lg font-semibold">Exportar</div>
            <div className="text-xs opacity-70">{subtitle}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <div className="rounded border border-white/10 p-3">
            <div className="text-xs opacity-70 mb-1">Qué exportar</div>
            <select
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="actual">Filtro actual</option>
              <option value="vencidas">Solo vencidas</option>
              <option value="hoy">Solo hoy</option>
              <option value="por_vencer">Solo por vencer</option>
              <option value="custom">Rango personalizado</option>
            </select>

            <label className="flex items-center gap-2 text-sm mt-3">
              <input
                type="checkbox"
                checked={onlyThisPage}
                onChange={(e) => setOnlyThisPage(e.target.checked)}
              />
              Exportar solo esta página (rápido)
            </label>
            {!onlyThisPage ? (
              <div className="text-xs opacity-60 mt-1">Trae todas las páginas (usa next del backend).</div>
            ) : null}
          </div>

          <div className="rounded border border-white/10 p-3">
            <div className="text-xs opacity-70 mb-1">Vista</div>
            <select
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              <option value="polizas">Pólizas</option>
              <option value="asegurados">Asegurados</option>
            </select>

            <div className="text-xs opacity-70 mb-1 mt-3">Formato</div>
            <select
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="excel">Excel (.xls)</option>
              <option value="pdf">PDF (Imprimir/Guardar)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
            disabled={busy}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className={`px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-sm ${
              busy ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={busy}
          >
            {busy ? "Exportando…" : "Descargar"}
          </button>
        </div>
      </div>
    </div>
  );
}
