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
const keyForSearch = (q, withCuotas) => {
  const base = keyFromQuery(q);
  if (!base) return "";
  return withCuotas ? `${base}|cuotas` : `${base}|lite`;
};

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

/** Marcar cuota como pagada (PATCH /cuotas/{id}/pagar/) */
export const marcarCuotaComoPagada = createAsyncThunk(
  "pagos/marcarCuotaComoPagada",
  async (payload, { rejectWithValue }) => {
    try {
      // ✅ Compat: antes se usaba cuotaId, ahora desde UI mandás id
      const cuotaId = payload?.cuotaId ?? payload?.id;

      if (!cuotaId) {
        return rejectWithValue({
          detail:
            "No se pudo pagar: falta el id de la cuota (payload.id / payload.cuotaId).",
        });
      }

      // ✅ Normalizamos nombres para matchear el backend
      const body = compact({
        fecha_pago: payload?.fecha_pago,
        forma_pago: payload?.forma_pago,
        metodo: payload?.metodo ?? payload?.medio_pago, // legacy
        monto: payload?.monto ?? payload?.monto_pagado, // legacy
        observaciones: payload?.observaciones ?? payload?.notas, // legacy

        // medios (tu backend mira medio_cobro_id y/o medio_cobro_valor / destino_cuenta)
        medio_cobro_id: payload?.medio_cobro_id,
        medio_cobro_valor:
          payload?.medio_cobro_valor ??
          payload?.destino_cuenta ??
          payload?.referencia,
        destino_cuenta: payload?.destino_cuenta,

        // opcional
        registrar_en_balance: payload?.registrar_en_balance,
      });

      // ✅ El backend define methods=['patch'] → POST da 405
      const { data } = await axios.patch(API(`cuotas/${cuotaId}/pagar/`), body);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al marcar como pagada"
      );
    }
  }
);

/** Enviar alertas */
export const enviarAlertas = createAsyncThunk(
  "pagos/enviarAlertas",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("notificaciones/cuotas/alertas/"));
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al enviar alertas");
    }
  }
);

/** Enviar recordatorios */
export const enviarRecordatoriosCuotas = createAsyncThunk(
  "pagos/enviarRecordatoriosCuotas",
  async (payload, { rejectWithValue }) => {
    try {
      const body = compact({
        alias: payload?.alias,
        alias_transferencia: payload?.alias_transferencia, // compat
        medio_cobro_id: payload?.medio_cobro_id,
        oficina: payload?.oficina,
      });

      const { data } = await axios.post(
        API("notificaciones/cuotas/recordatorios/"),
        body
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al enviar recordatorios"
      );
    }
  }
);

/** Historial recordatorios */
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

/** Buscar pólizas por texto (nombre, patente, modelo…) — con cache TTL
 *  arg:
 *    - "texto"
 *    - { query: "texto", withCuotas: true|false, limit: number }
 */
export const fetchPolizas = createAsyncThunk(
  "pagos/fetchPolizas",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const query =
        typeof arg === "string" || typeof arg === "number"
          ? String(arg)
          : String(arg?.query || "");

      const withCuotas = Boolean(
        typeof arg === "object" && arg ? arg.withCuotas : false
      );

      const limit = Math.max(
        1,
        Math.min(100, Number(typeof arg === "object" && arg ? arg.limit : 25) || 25)
      );

      const q = String(query || "").trim();
      const cacheKey = keyForSearch(q, withCuotas);
      if (!cacheKey) {
        return {
          polizas: [],
          originalQuery: q,
          cacheKey,
          fromCache: true,
          withCuotas,
        };
      }

      const st = getState()?.pagos;
      const cache = st?.polizasCache || {};
      const hit = cache?.[cacheKey];
      const now = Date.now();

      if (
        hit &&
        typeof hit.ts === "number" &&
        now - hit.ts < POLIZAS_CACHE_TTL_MS &&
        Array.isArray(hit.polizas)
      ) {
        return {
          polizas: hit.polizas,
          originalQuery: hit.originalQuery || q,
          cacheKey,
          fromCache: true,
          withCuotas,
        };
      }

      const { data } = await axios.get(API("polizas/"), {
        params: compact({
          search: q,
          page_size: limit,
          include_cuotas: withCuotas ? 1 : undefined,
        }),
      });

      const polizasList = Array.isArray(unwrap(data)) ? unwrap(data) : [];

      if (withCuotas) {
        const needsHydrate = polizasList.some((p) => !Array.isArray(p?.cuotas));

        if (!needsHydrate) {
          return {
            polizas: polizasList,
            originalQuery: q,
            cacheKey,
            fromCache: false,
            withCuotas,
          };
        }

        const ids = polizasList
          .map((p) => p?.id)
          .filter((id) => id !== undefined && id !== null);

        const idsToFetch = ids.slice(0, limit);
        const CONCURRENCY = 6;

        const detailed = [];
        for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
          const chunk = idsToFetch.slice(i, i + CONCURRENCY);

          const results = await Promise.allSettled(
            chunk.map((id) =>
              axios
                .get(API(`polizas/${id}/`), {
                  params: compact({
                    include_cuotas: 1,
                  }),
                })
                .then((r) => r.data)
            )
          );

          for (const r of results) {
            if (r.status === "fulfilled") detailed.push(r.value);
          }
        }

        const detailedPolizas = detailed.map((x) =>
          x && typeof x === "object" && "data" in x ? x.data : x
        );

        return {
          polizas: detailedPolizas,
          originalQuery: q,
          cacheKey,
          fromCache: false,
          withCuotas,
        };
      }

      return {
        polizas: polizasList,
        originalQuery: q,
        cacheKey,
        fromCache: false,
        withCuotas,
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al buscar pólizas");
    }
  }
);

/**
 * Registrar un ingreso en balances (POST /ingresos/)
 * Nota: al pagar una cuota ya NO hace falta (a menos que lo uses por separado)
 */
export const registrarIngreso = createAsyncThunk(
  "pagos/registrarIngreso",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("ingresos/"), payload);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al registrar ingreso");
    }
  }
);

/** Obtener cuotas a vencer */
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
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("medios-cobro/"));
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

/* ===================== SLICE ===================== */

const initialState = {
  status: "idle",
  error: null,

  cuotas: [],
  cuotasAVencer: [],

  // búsqueda
  searchStatus: "idle",
  searchError: null,
  polizas: [],

  // cache búsqueda
  polizasCache: {},
  polizasCacheOrder: [],

  // medios de cobro
  mediosCobro: [],
  mediosCobroStatus: "idle",
  mediosCobroError: null,

  // derivados
  mpCuentas: [],
  billeteras: [],

  // notificaciones
  alertasStatus: "idle",
  alertasError: null,
  recordatoriosStatus: "idle",
  recordatoriosError: null,

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

function savePolizasCache(state, a, b, c) {
  // Soporta 2 firmas:
  //  - (state, originalQuery, polizas)  [legacy]
  //  - (state, cacheKey, originalQuery, polizas)
  let cacheKey = "";
  let originalQuery = "";
  let polizas = [];

  if (c === undefined) {
    originalQuery = a;
    polizas = b;
    cacheKey = keyFromQuery(originalQuery);
  } else {
    cacheKey = String(a || "").trim().toLowerCase();
    originalQuery = b;
    polizas = c;
  }

  if (!cacheKey) return;

  state.polizasCache[cacheKey] = {
    ts: Date.now(),
    polizas: Array.isArray(polizas) ? polizas : [],
    originalQuery: String(originalQuery || "").trim(),
  };

  // actualizar orden (MRU)
  const prev = Array.isArray(state.polizasCacheOrder)
    ? state.polizasCacheOrder
    : [];
  const next = [cacheKey, ...prev.filter((x) => x !== cacheKey)].slice(
    0,
    POLIZAS_CACHE_MAX
  );
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
  reducers: {
    setCuotas(state, action) {
      state.cuotas = Array.isArray(action.payload) ? action.payload : [];
    },
    clearSearch(state) {
      state.polizas = [];
      state.searchStatus = "idle";
      state.searchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Buscar pólizas ---
      .addCase(fetchPolizas.pending, (state) => {
        state.searchStatus = "loading";
        state.searchError = null;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        const payload = action.payload || {};
        const polizas = payload.polizas ?? payload ?? [];
        state.polizas = Array.isArray(polizas) ? polizas : [];
        savePolizasCache(
          state,
          payload.cacheKey || payload.originalQuery,
          payload.originalQuery,
          state.polizas
        );
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
        state.mediosCobroStatus = "loading";
        state.mediosCobroError = null;
      })
      .addCase(fetchMediosCobro.fulfilled, (state, action) => {
        state.mediosCobroStatus = "succeeded";
        state.mediosCobro = Array.isArray(action.payload) ? action.payload : [];
        recomputeMedioNombres(state);
      })
      .addCase(fetchMediosCobro.rejected, (state, action) => {
        state.mediosCobroStatus = "failed";
        state.mediosCobroError = action.payload;
      })

      // --- Medios de cobro: crear ---
      .addCase(crearMedioCobro.fulfilled, (state, action) => {
        state.mediosCobro = [action.payload, ...(state.mediosCobro || [])];
        recomputeMedioNombres(state);
      })

      // --- Medios de cobro: actualizar ---
      .addCase(actualizarMedioCobro.fulfilled, (state, action) => {
        const updated = action.payload;
        state.mediosCobro = (state.mediosCobro || []).map((m) =>
          m.id === updated?.id ? updated : m
        );
        recomputeMedioNombres(state);
      })

      // --- Medios de cobro: eliminar ---
      .addCase(eliminarMedioCobro.fulfilled, (state, action) => {
        const id = action.payload;
        state.mediosCobro = (state.mediosCobro || []).filter((m) => m.id !== id);
        recomputeMedioNombres(state);
      })

      // --- Alertas ---
      .addCase(enviarAlertas.pending, (state) => {
        state.alertasStatus = "loading";
        state.alertasError = null;
      })
      .addCase(enviarAlertas.fulfilled, (state) => {
        state.alertasStatus = "succeeded";
      })
      .addCase(enviarAlertas.rejected, (state, action) => {
        state.alertasStatus = "failed";
        state.alertasError = action.payload;
      })

      // --- Recordatorios ---
      .addCase(enviarRecordatoriosCuotas.pending, (state) => {
        state.recordatoriosStatus = "loading";
        state.recordatoriosError = null;
      })
      .addCase(enviarRecordatoriosCuotas.fulfilled, (state) => {
        state.recordatoriosStatus = "succeeded";
      })
      .addCase(enviarRecordatoriosCuotas.rejected, (state, action) => {
        state.recordatoriosStatus = "failed";
        state.recordatoriosError = action.payload;
      })

      // --- Historial recordatorios ---
      .addCase(fetchHistorialRecordatorios.pending, (state) => {
        state.historialRecordatoriosStatus = "loading";
        state.historialRecordatoriosError = null;
      })
      .addCase(fetchHistorialRecordatorios.fulfilled, (state, action) => {
        state.historialRecordatoriosStatus = "succeeded";
        state.historialRecordatorios = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(fetchHistorialRecordatorios.rejected, (state, action) => {
        state.historialRecordatoriosStatus = "failed";
        state.historialRecordatoriosError = action.payload;
      });
  },
});

export const { setCuotas, clearSearch } = pagosSlice.actions;
export default pagosSlice.reducer;
