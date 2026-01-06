/* src/store/slices/pagosSlice.js — Optimizado: cache búsqueda + estados separados */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* Helper para armar URLs robustas sin dobles barras */
const BASE_URL = import.meta.env.VITE_API_URL || "/api/";
const API = (path) =>
  `${String(BASE_URL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

/* Normaliza payloads que pueden venir paginados o no */
const unwrap = (data) =>
  data && typeof data === "object" && "results" in data ? data.results : data;

/* Saca claves con undefined o string vacío, para no pisar en el backend */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== "")
  );

/* ===================== CACHE DE BÚSQUEDA ===================== */
const POLIZAS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos
const POLIZAS_CACHE_MAX = 20;
const keyFromQuery = (q) => String(q || "").trim().toLowerCase();

/* ============== THUNKS ============== */

/** Obtener todas las cuotas (admin) */
export const fetchTodasLasCuotas = createAsyncThunk(
  "pagos/fetchTodasLasCuotas",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("cuotas/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al obtener cuotas");
    }
  }
);

/**
 * Marcar una cuota como pagada (PATCH /cuotas/{id}/pagar/)
 * Acepta:
 *  - forma_pago ("efectivo" | "transferencia")  [opcional]
 *  - metodo ("efectivo" | "transferencia" | "mercado_pago" | "tarjeta")  [opcional]
 *  - monto, fecha_pago, observaciones, medio_cobro_id, destino_tipo, destino_cuenta  [opcionales]
 */
export const marcarCuotaComoPagada = createAsyncThunk(
  "pagos/marcarCuotaComoPagada",
  async (
    {
      id,
      forma_pago,
      metodo,
      monto,
      fecha_pago,
      observaciones,
      medio_cobro_id,
      destino_tipo,
      destino_cuenta,
    },
    { rejectWithValue }
  ) => {
    try {
      const payload = compact({
        metodo,
        forma_pago,
        monto,
        fecha_pago,
        observaciones,
        medio_cobro_id,
        destino_tipo,
        destino_cuenta,
      });

      const { data } = await axios.patch(API(`cuotas/${id}/pagar/`), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al marcar cuota como pagada"
      );
    }
  }
);

/** Enviar alertas manualmente (POST /pagos/enviar-alertas/) */
export const enviarAlertas = createAsyncThunk(
  "pagos/enviarAlertas",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("pagos/enviar-alertas/"));
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al enviar alertas");
    }
  }
);

/** 🔔 Enviar recordatorios de cuotas vía app `notificaciones` */
export const enviarRecordatoriosCuotas = createAsyncThunk(
  "pagos/enviarRecordatoriosCuotas",
  async (payload = {}, { rejectWithValue }) => {
    try {
      const body = compact({
        alias: payload.alias,
        medio_cobro_id: payload.medio_cobro_id,
        oficina: payload.oficina,
      });

      const { data } = await axios.post(
        API("notificaciones/cuotas/enviar-recordatorios/"),
        body
      );

      const {
        hoy,
        cuotas_procesadas,
        mensajes_enviados,
        errores = [],
      } = data || {};

      return {
        hoy,
        procesadas: cuotas_procesadas,
        enviados: mensajes_enviados,
        errores,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al enviar recordatorios de cuotas"
      );
    }
  }
);

/** 📜 Historial de recordatorios enviados (GET /notificaciones/cuotas/historial/) */
export const fetchHistorialRecordatorios = createAsyncThunk(
  "pagos/fetchHistorialRecordatorios",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("notificaciones/cuotas/historial/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener historial de recordatorios"
      );
    }
  }
);

/** Buscar pólizas por texto (nombre, patente, modelo…) — con cache TTL */
export const fetchPolizas = createAsyncThunk(
  "pagos/fetchPolizas",
  async (query, { rejectWithValue, getState }) => {
    try {
      const q = String(query || "").trim();
      const k = keyFromQuery(q);
      if (!k) return { polizas: [], originalQuery: q, fromCache: true };

      const st = getState()?.pagos;
      const cache = st?.polizasCache || {};
      const hit = cache?.[k];
      const now = Date.now();

      if (
        hit &&
        typeof hit.ts === "number" &&
        now - hit.ts < POLIZAS_CACHE_TTL_MS &&
        Array.isArray(hit.polizas)
      ) {
        return { polizas: hit.polizas, originalQuery: q, fromCache: true };
      }

      const { data } = await axios.get(API("polizas/"), {
        params: { search: q },
      });

      return {
        polizas: unwrap(data),
        originalQuery: q,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al buscar pólizas");
    }
  }
);

/**
 * Registrar un ingreso en balances (POST /ingresos/)
 * Nota: al pagar una cuota ya NO hace falta (se genera por signal de backend).
 */
export const registrarIngreso = createAsyncThunk(
  "pagos/registrarIngreso",
  async (ingresoData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("ingresos/"), ingresoData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al registrar ingreso"
      );
    }
  }
);

/** Obtener cuotas a vencer (GET /cuotas/a-vencer/) */
export const fetchCuotasAVencer = createAsyncThunk(
  "pagos/fetchCuotasAVencer",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("cuotas/a-vencer/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener cuotas a vencer"
      );
    }
  }
);

/* ---------- CRUD de Medios de Cobro (billeteras / MP) ---------- */

export const fetchMediosCobro = createAsyncThunk(
  "pagos/fetchMediosCobro",
  async ({ activo = true } = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("medios-cobro/"), {
        params: compact({ activo }),
      });
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener medios de cobro"
      );
    }
  }
);

export const crearMedioCobro = createAsyncThunk(
  "pagos/crearMedioCobro",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("medios-cobro/"), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al crear medio de cobro"
      );
    }
  }
);

export const actualizarMedioCobro = createAsyncThunk(
  "pagos/actualizarMedioCobro",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(API(`medios-cobro/${id}/`), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al actualizar medio de cobro"
      );
    }
  }
);

export const eliminarMedioCobro = createAsyncThunk(
  "pagos/eliminarMedioCobro",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(API(`medios-cobro/${id}/`));
      return id;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al eliminar medio de cobro"
      );
    }
  }
);

/* ============== SLICE ============== */

const initialState = {
  // Estado general (para acciones que no sean “buscar pólizas”)
  status: "idle",
  error: null,

  // Estado específico del buscador (PagosSearch)
  searchStatus: "idle",
  searchError: null,

  polizas: [],
  cuotas: [],
  cuotasAVencer: [],

  // Cache de búsquedas de pólizas
  polizasCache: {}, // { [key]: { ts, polizas, originalQuery } }
  polizasCacheOrder: [], // keys en orden reciente

  // Medios de cobro
  mediosCobro: [],
  mpCuentas: [],
  billeteras: [],

  // Historial de recordatorios de cuotas
  historialRecordatorios: [],
  historialRecordatoriosStatus: "idle",
  historialRecordatoriosError: null,
};

function recomputeMedioNombres(state) {
  const activos = (state.mediosCobro || []).filter((m) => m.activo !== false);
  state.mpCuentas = activos
    .filter((m) => m.proveedor === "mercado_pago")
    .map((m) => m.etiqueta || m.valor)
    .filter(Boolean);
  state.billeteras = activos
    .filter((m) => m.proveedor === "billetera_virtual")
    .map((m) => m.etiqueta || m.valor)
    .filter(Boolean);
}

function savePolizasCache(state, originalQuery, polizas) {
  const k = keyFromQuery(originalQuery);
  if (!k) return;

  state.polizasCache[k] = {
    ts: Date.now(),
    polizas: Array.isArray(polizas) ? polizas : [],
    originalQuery: String(originalQuery || "").trim(),
  };

  // actualizar orden (MRU)
  const prev = Array.isArray(state.polizasCacheOrder)
    ? state.polizasCacheOrder
    : [];
  const next = [k, ...prev.filter((x) => x !== k)].slice(0, POLIZAS_CACHE_MAX);
  state.polizasCacheOrder = next;

  // limpieza extra (si sobran keys)
  const keep = new Set(next);
  Object.keys(state.polizasCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.polizasCache[key];
  });
}

const pagosSlice = createSlice({
  name: "pagos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Todas las cuotas ---
      .addCase(fetchTodasLasCuotas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTodasLasCuotas.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cuotas = action.payload || [];
      })
      .addCase(fetchTodasLasCuotas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Marcar cuota como pagada ---
      .addCase(marcarCuotaComoPagada.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(marcarCuotaComoPagada.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updated = action.payload;
        if (updated?.id && Array.isArray(state.cuotas) && state.cuotas.length) {
          state.cuotas = state.cuotas.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c
          );
        }
      })
      .addCase(marcarCuotaComoPagada.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Enviar alertas ---
      .addCase(enviarAlertas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(enviarAlertas.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(enviarAlertas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Enviar recordatorios de cuotas (notificaciones) ---
      .addCase(enviarRecordatoriosCuotas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(enviarRecordatoriosCuotas.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(enviarRecordatoriosCuotas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Historial de recordatorios ---
      .addCase(fetchHistorialRecordatorios.pending, (state) => {
        state.historialRecordatoriosStatus = "loading";
        state.historialRecordatoriosError = null;
      })
      .addCase(fetchHistorialRecordatorios.fulfilled, (state, action) => {
        state.historialRecordatoriosStatus = "succeeded";
        state.historialRecordatorios = action.payload || [];
      })
      .addCase(fetchHistorialRecordatorios.rejected, (state, action) => {
        state.historialRecordatoriosStatus = "failed";
        state.historialRecordatoriosError = action.payload;
      })

      // --- Buscar pólizas (estado separado + cache) ---
      .addCase(fetchPolizas.pending, (state) => {
        state.searchStatus = "loading";
        state.searchError = null;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        const payload = action.payload || {};
        const polizas = payload.polizas ?? payload ?? [];
        state.polizas = Array.isArray(polizas) ? polizas : [];
        savePolizasCache(state, payload.originalQuery, state.polizas);
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        state.searchStatus = "failed";
        state.searchError = action.payload;
      })

      // --- Cuotas a vencer ---
      .addCase(fetchCuotasAVencer.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCuotasAVencer.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cuotasAVencer = action.payload || [];
      })
      .addCase(fetchCuotasAVencer.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Medios de cobro: listar ---
      .addCase(fetchMediosCobro.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMediosCobro.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.mediosCobro = action.payload || [];
        recomputeMedioNombres(state);
      })
      .addCase(fetchMediosCobro.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Medios de cobro: crear ---
      .addCase(crearMedioCobro.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(crearMedioCobro.fulfilled, (state, action) => {
        state.status = "succeeded";
        const nuevo = action.payload;
        state.mediosCobro = [nuevo, ...(state.mediosCobro || [])];
        recomputeMedioNombres(state);
      })
      .addCase(crearMedioCobro.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Medios de cobro: actualizar ---
      .addCase(actualizarMedioCobro.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(actualizarMedioCobro.fulfilled, (state, action) => {
        state.status = "succeeded";
        const upd = action.payload;
        state.mediosCobro = (state.mediosCobro || []).map((m) =>
          m.id === upd.id ? { ...m, ...upd } : m
        );
        recomputeMedioNombres(state);
      })
      .addCase(actualizarMedioCobro.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Medios de cobro: eliminar ---
      .addCase(eliminarMedioCobro.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(eliminarMedioCobro.fulfilled, (state, action) => {
        state.status = "succeeded";
        const id = action.payload;
        state.mediosCobro = (state.mediosCobro || []).filter((m) => m.id !== id);
        recomputeMedioNombres(state);
      })
      .addCase(eliminarMedioCobro.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default pagosSlice.reducer;
