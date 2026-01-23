// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBajas,
  fetchBajasOficinas,
  selectBajas,
  selectBajasCount,
  selectBajasError,
  selectBajasNext,
  selectBajasOficinas,
  selectBajasOficinasStatus,
  selectBajasPrevious,
  selectBajasStatus,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const STATUS = {
  ENVIAR: "ENVIAR_BAJA",
  ENVIADA: "BAJA_ENVIADA",
  REALIZADA: "BAJA_REALIZADA",
};

const LS = {
  oficina: "scope.bajas.oficina",
  destinatario: "scope.bajas.destinatario",
  statusById: "bajas.statusByPoliza.v1",
};

function loadStatusMap() {
  try {
    const raw = localStorage.getItem(LS.statusById);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveStatusMap(map) {
  try {
    localStorage.setItem(LS.statusById, JSON.stringify(map || {}));
  } catch {}
}

export default function BajasPage() {
  const dispatch = useDispatch();

  const items = useSelector(selectBajas);
  const count = useSelector(selectBajasCount);
  const next = useSelector(selectBajasNext);
  const previous = useSelector(selectBajasPrevious);

  const status = useSelector(selectBajasStatus);
  const error = useSelector(selectBajasError);

  const oficinas = useSelector(selectBajasOficinas);
  const oficinasStatus = useSelector(selectBajasOficinasStatus);

  const [oficina, setOficina] = useState(() => {
    try {
      return (localStorage.getItem(LS.oficina) || "").toString();
    } catch {
      return "";
    }
  });

  const [destinatario, setDestinatario] = useState(() => {
    try {
      return (localStorage.getItem(LS.destinatario) || "").toString();
    } catch {
      return "";
    }
  });

  const [search, setSearch] = useState("");
  const [soloRequiereBaja, setSoloRequiereBaja] = useState(true);

  // ✅ default 15 días
  const [umbralDias, setUmbralDias] = useState(15);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Estado por póliza (persistido)
  const [statusById, setStatusById] = useState(() => loadStatusMap());

  // Selección masiva
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const totalPages = useMemo(() => {
    const c = Number(count) || 0;
    const ps = Number(pageSize) || 25;
    return Math.max(1, Math.ceil(c / ps));
  }, [count, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    dispatch(fetchBajasOficinas({ force: false }));
  }, [dispatch]);

  useEffect(() => {
    try {
      localStorage.setItem(LS.oficina, String(oficina || ""));
    } catch {}
  }, [oficina]);

  useEffect(() => {
    try {
      localStorage.setItem(LS.destinatario, String(destinatario || ""));
    } catch {}
  }, [destinatario]);

  useEffect(() => {
    saveStatusMap(statusById);
  }, [statusById]);

  const load = (opts = {}) => {
    const params = {
      modo: "vencidas",
      past_days: "365",
      future_days: "0",
      page: String(page),
      page_size: String(pageSize),
    };

    if (oficina) params.oficina = oficina;
    if (search.trim()) params.search = search.trim();

    // FINALIZADA no requiere baja
    params.include_finalizadas = "0";

    dispatch(fetchBajas({ params, force: !!opts.force }));
  };

  useEffect(() => {
    load({ force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, oficina]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      dispatch(
        fetchBajas({
          params: {
            modo: "vencidas",
            past_days: "365",
            future_days: "0",
            page: "1",
            page_size: String(pageSize),
            ...(oficina ? { oficina } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
            include_finalizadas: "0",
          },
          force: true,
        })
      );
    }, 250);
    return () => clearTimeout(t);
  }, [search, oficina, pageSize, dispatch]);

  const enriched = useMemo(() => {
    const hoy = new Date();

    const out = (items || []).map((p) => {
      const proximaImpaga = parseDate(p?.proxima_vencimiento_impaga);
      const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : null;

      const impagas = Number(p?.impagas_count) || 0;

      const requiereBaja =
        (p?.estado || "").toString().toLowerCase() !== "finalizada" &&
        impagas > 0 &&
        (diasMora ?? -999999) >= Number(umbralDias || 15);

      const saved = statusById?.[String(p?.id)] || null;
      const bajaStatus = requiereBaja ? saved || STATUS.ENVIAR : "OK";

      return {
        ...p,
        _diasMora: diasMora,
        _requiereBaja: requiereBaja,
        _bajaStatus: bajaStatus,
      };
    });

    out.sort((a, b) => {
      const da = a._diasMora ?? -1;
      const db = b._diasMora ?? -1;
      return db - da;
    });

    return out;
  }, [items, umbralDias, statusById]);

  const filtered = useMemo(() => {
    const arr = enriched || [];
    if (!soloRequiereBaja) return arr;
    return arr.filter((x) => x._requiereBaja);
  }, [enriched, soloRequiereBaja]);

  const totalRequiere = useMemo(() => {
    return (enriched || []).filter((x) => x._requiereBaja).length;
  }, [enriched]);

  const canPrev = page > 1 && !!previous;
  const canNext = page < totalPages && !!next;

  // --- acciones estado ---
  const setPolizaStatus = (polizaId, nextStatus) => {
    const id = String(polizaId);
    setStatusById((prev) => {
      const copy = { ...(prev || {}) };
      if (!nextStatus) delete copy[id];
      else copy[id] = nextStatus;
      return copy;
    });
  };

  // --- selección ---
  const toggleSelect = (polizaId) => {
    const id = String(polizaId);
    setSelectedIds((prev) => {
      const s = new Set(prev || []);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllVisible = (checked) => {
    setSelectedIds((prev) => {
      const s = new Set(prev || []);
      if (!checked) {
        for (const p of filtered) s.delete(String(p.id));
        return s;
      }
      for (const p of filtered) s.add(String(p.id));
      return s;
    });
  };

  // --- mailto masivo / individual ---
  const composeEmail = (ids) => {
    const to = String(destinatario || "").trim();
    if (!to) {
      alert("Falta el Hotmail destino (campo 'Enviar a').");
      return;
    }

    const setIds = new Set((ids || []).map((x) => String(x)));
    const rows = filtered.filter((p) => setIds.has(String(p.id)));

    if (rows.length === 0) {
      alert("No hay pólizas seleccionadas para el correo.");
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fecha = `${yyyy}-${mm}-${dd}`;

    const subject = `Solicitud de baja - ${fecha} (${rows.length})`;

    const lines = rows.map((p) => {
      const nro = p?.numero_poliza || "—";
      const comp = p?.compania || "—";
      const vto = p?.proxima_vencimiento_impaga || "—";
      const mora = p?._diasMora == null ? "—" : `${p._diasMora}d`;
      return `- Poliza ${nro} | ${comp} | Vto impaga: ${vto} | Mora: ${mora} | ID: ${p.id}`;
    });

    const body =
      `Hola,\n\nSolicito la baja de las siguientes pólizas:\n\n` +
      lines.join("\n") +
      `\n\nGracias.\n`;

    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = url;
  };

  const bulkSetStatus = (nextStatus) => {
    const ids = Array.from(selectedIds || []);
    if (ids.length === 0) return;
    for (const id of ids) setPolizaStatus(id, nextStatus);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Bajas</h1>
          <p className="text-sm text-brand-200/80 dark:text-brand-200/70">
            Muestra pólizas con impagas en mora (default: 15 días) para gestionar la baja.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => load({ force: true })}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Config correo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <label className="text-xs font-bold opacity-80">Enviar a (Hotmail)</label>
          <input
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="ej: bajas_thames@hotmail.com"
            className="mt-1 w-full bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2"
          />
          <div className="text-xs opacity-60 mt-1">
            Se abre con el mail del sistema (Outlook si es el predeterminado).
          </div>
        </div>

        <div className="md:col-span-7 flex items-end gap-2 flex-wrap">
          <button
            className={`px-3 py-2 rounded-lg ${
              selectedIds.size > 0
                ? "bg-white/10 hover:bg-white/15"
                : "bg-white/5 opacity-50"
            }`}
            disabled={selectedIds.size === 0}
            onClick={() => composeEmail(Array.from(selectedIds))}
          >
            Redactar correo (seleccionadas)
          </button>

          <button
            className={`px-3 py-2 rounded-lg ${
              selectedIds.size > 0
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-100"
                : "bg-white/5 opacity-50"
            }`}
            disabled={selectedIds.size === 0}
            onClick={() => bulkSetStatus(STATUS.ENVIADA)}
          >
            Marcar “Baja enviada”
          </button>

          <button
            className={`px-3 py-2 rounded-lg ${
              selectedIds.size > 0
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100"
                : "bg-white/5 opacity-50"
            }`}
            disabled={selectedIds.size === 0}
            onClick={() => bulkSetStatus(STATUS.REALIZADA)}
          >
            Marcar “Baja realizada”
          </button>

          <button
            className={`px-3 py-2 rounded-lg ${
              selectedIds.size > 0
                ? "bg-white/10 hover:bg-white/15"
                : "bg-white/5 opacity-50"
            }`}
            disabled={selectedIds.size === 0}
            onClick={clearSelection}
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <label className="text-xs font-bold opacity-80">Oficina</label>
          <select
            value={oficina}
            onChange={(e) => {
              setPage(1);
              setOficina(e.target.value);
            }}
            disabled={oficinasStatus === "loading"}
            className="mt-1 w-full bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2"
          >
            <option value="">Todas</option>
            {(oficinas || []).map((o) => (
              <option key={String(o.id)} value={String(o.id)}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="text-xs font-bold opacity-80">Buscar</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Patente, asegurado, DNI, número póliza..."
            className="mt-1 w-full bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold opacity-80">Mora (días)</label>
          <input
            type="number"
            min={0}
            value={umbralDias}
            onChange={(e) => setUmbralDias(Number(e.target.value || 0))}
            className="mt-1 w-full bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2"
          />
        </div>

        <div className="md:col-span-3 flex items-end gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloRequiereBaja}
              onChange={(e) => setSoloRequiereBaja(e.target.checked)}
            />
            Solo “requiere baja”
          </label>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs opacity-70">Total backend</div>
          <div className="text-2xl font-extrabold">{Number(count) || 0}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs opacity-70">Visibles</div>
          <div className="text-2xl font-extrabold">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs opacity-70">Requiere baja (en página)</div>
          <div className="text-2xl font-extrabold">{totalRequiere}</div>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-lg ${
              canPrev ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50"
            }`}
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>

          <button
            className={`px-3 py-2 rounded-lg ${
              canNext ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50"
            }`}
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>

          <span className="text-sm opacity-80">
            Página: {page} / {totalPages}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm opacity-80">Tamaño</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado */}
      {status === "loading" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          Cargando…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
          {String(error)}
        </div>
      )}

      {/* Tabla */}
      <BajasTable
        items={filtered}
        destinatario={destinatario}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAllVisible={selectAllVisible}
        onComposeEmail={composeEmail}
        onSetStatus={setPolizaStatus}
      />
    </div>
  );
}
