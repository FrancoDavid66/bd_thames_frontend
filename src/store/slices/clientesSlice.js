// src/store/slices/clientesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * Base URL robusta para clientes:
 * - Si hay VITE_API_URL:
 *    - Si ya termina en /api o /api/, se usa tal cual.
 *    - Si no, se le agrega /api/.
 * - Si NO hay VITE_API_URL, fallback a "/api/" (comportamiento clásico).
 */
const RAW_ENV = (import.meta.env?.VITE_API_URL || "").toString().trim();

const buildBaseURL = () => {
  if (RAW_ENV) {
    // limpiamos barras del final
    const trimmed = RAW_ENV.replace(/\/+$/, "");
    const endsWithApi = trimmed.endsWith("/api");
    const withApi = endsWithApi ? trimmed : `${trimmed}/api`;
    return `${withApi}/`;
  }
  // fallback clásico
  return "/api/";
};

const BASE = buildBaseURL();

// Instancia axios consistente
const http = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

/** Helpers */
const normalizeStr = (v) => String(v ?? "").trim();
const buildListQueryKey = ({ page, page_size, search, estado, ordering }) => {
  const p = Number(page || 1);
  const ps = page_size ? Number(page_size) : "";
  const s = normalizeStr(search);
  const e = normalizeStr(estado || "todos");
  const o = normalizeStr(ordering || "-id");
  return `p=${p}|ps=${ps}|s=${encodeURIComponent(s)}|e=${encodeURIComponent(
    e
  )}|o=${encodeURIComponent(o)}`;
};

/**
 * LISTADO (paginado DRF)
 * Soporta:
 * - page, page_size
 * - search
 * - estado
 * - ordering (si lo activás en backend)
 *
 * ✅ Optimización: dedupe por queryKey (si ya se cargó exactamente lo mismo, no refetch)
 */
export const fetchClientes = createAsyncThunk(
  "clientes/fetchClientes",
  async (
    { page = 1, page_size, pageSize, search = "", estado = "todos", ordering },
    { rejectWithValue, signal }
  ) => {
    try {
      const params = { page };

      const ps = page_size ?? pageSize;
      if (ps) params.page_size = ps;

      if (search != null) params.search = search;

      if (estado && estado !== "todos") params.estado = estado;

      if (ordering) params.ordering = ordering;

      const { data } = await http.get("clientes/", { params, signal });
      // data = { results, count, next, previous }
      return { data, _meta: { queryKey: buildListQueryKey({ page, page_size: ps, search, estado, ordering }) } };
    } catch (error) {
      // Abort: axios lanza CanceledError; devolvemos algo limpio
      if (axios.isCancel?.(error) || error?.name === "CanceledError") {
        return rejectWithValue({ aborted: true });
      }
      return rejectWithValue(
        error.response?.data || "Error al obtener clientes"
      );
    }
  },
  {
    condition: (arg, { getState }) => {
      const st = getState().clientes;
      const page = arg?.page ?? st.page ?? 1;
      const ps = arg?.page_size ?? arg?.pageSize ?? st.pageSize;
      const search = arg?.search ?? st.search ?? "";
      const estado = arg?.estado ?? st.estado ?? "todos";
      const ordering = arg?.ordering ?? st.ordering ?? "-id";

      const key = buildListQueryKey({
        page,
        page_size: ps,
        search,
        estado,
        ordering,
      });

      // Si ya tenemos exactamente esa lista cargada y no estamos "loading", skip
      if (st.lastListQueryKey === key && st.status === "succeeded") {
        return false;
      }
      return true;
    },
  }
);

/**
 * DETALLE por ID (para perfil)
 * ✅ Cache por id: si ya tenemos detalle completo, no refetch
 */
export const fetchClienteById = createAsyncThunk(
  "clientes/fetchClienteById",
  async (id, { rejectWithValue, signal }) => {
    try {
      if (!id) throw new Error("Falta id");
      const { data } = await http.get(`clientes/${id}/`, { signal });
      return data;
    } catch (error) {
      if (axios.isCancel?.(error) || error?.name === "CanceledError") {
        return rejectWithValue({ aborted: true });
      }
      return rejectWithValue(
        error.response?.data || error.message || "Error al obtener cliente"
      );
    }
  },
  {
    condition: (id, { getState }) => {
      const st = getState().clientes;
      const key = String(id);
      const cached = st.byId?.[key];
      // si tenemos detalle ya cargado, evitamos refetch
      if (cached && cached.__hasDetail) return false;
      return true;
    },
  }
);

export const createCliente = createAsyncThunk(
  "clientes/createCliente",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post("clientes/", payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error al crear cliente");
    }
  }
);

export const updateCliente = createAsyncThunk(
  "clientes/updateCliente",
  async ({ id, ...partial }, { rejectWithValue }) => {
    try {
      if (!id) throw new Error("Falta id de cliente");
      const { data } = await http.patch(`clientes/${id}/`, partial);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Error al actualizar cliente"
      );
    }
  }
);

export const deleteCliente = createAsyncThunk(
  "clientes/deleteCliente",
  async (id, { rejectWithValue }) => {
    try {
      if (!id) throw new Error("Falta id");
      await http.delete(`clientes/${id}/`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error al eliminar cliente");
    }
  }
);

// Pagar cuota (opcional fecha_pago "YYYY-MM-DD")
export const pagarCuota = createAsyncThunk(
  "clientes/pagarCuota",
  async ({ cuotaId, fecha_pago }, { rejectWithValue }) => {
    try {
      const payload = {};
      if (fecha_pago) payload.fecha_pago = fecha_pago;
      const { data } = await http.patch(`cuotas/${cuotaId}/pagar/`, payload);
      return { cuotaId, ...data };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error al pagar la cuota");
    }
  }
);

const clientesSlice = createSlice({
  name: "clientes",
  initialState: {
    // listado (página actual)
    clientes: [],
    count: 0,
    next: null,
    previous: null,

    // UI state
    status: "idle", // idle | loading | succeeded | failed
    error: null,

    search: "",
    estado: "todos",
    ordering: "-id",

    page: 1,
    pageSize: 25,

    // dedupe
    lastListQueryKey: null,
    listFetchedAt: null,

    // cache por id
    byId: {}, // { [id]: cliente }
    byIdStatus: {}, // { [id]: idle|loading|succeeded|failed }
    byIdError: {}, // { [id]: error }
  },
  reducers: {
    setSearch: (state, action) => {
      state.search = action.payload ?? "";
      state.page = 1;
    },
    setEstado: (state, action) => {
      state.estado = action.payload ?? "todos";
      state.page = 1;
    },
    setPage: (state, action) => {
      const p = Number(action.payload || 1);
      state.page = Number.isFinite(p) && p > 0 ? p : 1;
    },
    // nuevos (los usaremos cuando optimicemos ClientesPage)
    setPageSize: (state, action) => {
      const ps = Number(action.payload || 25);
      state.pageSize = Number.isFinite(ps) && ps > 0 ? ps : 25;
      state.page = 1;
    },
    setOrdering: (state, action) => {
      state.ordering = action.payload ?? "-id";
      state.page = 1;
    },
    clearClienteCache: (state, action) => {
      const id = action?.payload ? String(action.payload) : null;
      if (id) {
        delete state.byId[id];
        delete state.byIdStatus[id];
        delete state.byIdError[id];
      } else {
        state.byId = {};
        state.byIdStatus = {};
        state.byIdError = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // -------- LIST --------
      .addCase(fetchClientes.pending, (state, action) => {
        state.status = "loading";
        state.error = null;

        const arg = action.meta.arg || {};
        const page = arg.page ?? state.page ?? 1;
        const ps = arg.page_size ?? arg.pageSize ?? state.pageSize;
        const search = arg.search ?? state.search ?? "";
        const estado = arg.estado ?? state.estado ?? "todos";
        const ordering = arg.ordering ?? state.ordering ?? "-id";
        state.lastListQueryKey = buildListQueryKey({
          page,
          page_size: ps,
          search,
          estado,
          ordering,
        });
      })
      .addCase(fetchClientes.fulfilled, (state, action) => {
        state.status = "succeeded";

        const payload = action.payload?.data || {};
        state.clientes = payload.results || [];
        state.count = payload.count ?? 0;
        state.next = payload.next || null;
        state.previous = payload.previous || null;

        // cache básico por id (sirve para linkear rápido)
        for (const c of state.clientes) {
          const id = c?.id != null ? String(c.id) : null;
          if (!id) continue;
          const prev = state.byId[id] || {};
          // no pisamos detalle si ya existe
          const keepDetail = prev.__hasDetail ? prev : null;
          state.byId[id] = keepDetail
            ? { ...keepDetail, ...c, __basic: true, __hasDetail: true }
            : { ...prev, ...c, __basic: true };
        }

        state.listFetchedAt = Date.now();
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        // abort: no lo marcamos como failed “real”
        if (action.payload?.aborted) {
          state.status = "idle";
          return;
        }
        state.status = "failed";
        state.error = action.payload || "Error";
      })

      // -------- DETAIL --------
      .addCase(fetchClienteById.pending, (state, action) => {
        const id = String(action.meta.arg);
        state.byIdStatus[id] = "loading";
        state.byIdError[id] = null;
      })
      .addCase(fetchClienteById.fulfilled, (state, action) => {
        const c = action.payload;
        const id = c?.id != null ? String(c.id) : String(action.meta.arg);
        const prev = state.byId[id] || {};
        state.byId[id] = { ...prev, ...c, __hasDetail: true };
        state.byIdStatus[id] = "succeeded";
      })
      .addCase(fetchClienteById.rejected, (state, action) => {
        const id = String(action.meta.arg);
        if (action.payload?.aborted) {
          state.byIdStatus[id] = "idle";
          return;
        }
        state.byIdStatus[id] = "failed";
        state.byIdError[id] = action.payload || "Error";
      })

      // -------- CRUD --------
      .addCase(createCliente.fulfilled, (state, action) => {
        const c = action.payload;
        // insert optimista en lista actual
        state.clientes.unshift(c);
        state.count += 1;

        const id = c?.id != null ? String(c.id) : null;
        if (id) {
          state.byId[id] = { ...(state.byId[id] || {}), ...c, __hasDetail: true };
        }
      })
      .addCase(updateCliente.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = updated?.id != null ? String(updated.id) : null;

        // update en lista actual
        state.clientes = state.clientes.map((c) =>
          String(c.id) === String(updated.id) ? updated : c
        );

        // update cache
        if (id) {
          const prev = state.byId[id] || {};
          state.byId[id] = { ...prev, ...updated, __hasDetail: prev.__hasDetail || true };
        }
      })
      .addCase(deleteCliente.fulfilled, (state, action) => {
        const id = String(action.payload.id);
        state.clientes = state.clientes.filter((c) => String(c.id) !== id);
        state.count = Math.max(0, (state.count || 0) - 1);

        delete state.byId[id];
        delete state.byIdStatus[id];
        delete state.byIdError[id];
      })

      // -------- pagarCuota (actualiza lo que esté en cache) --------
      .addCase(pagarCuota.fulfilled, (state, action) => {
        const { cuotaId, fecha_pago } = action.payload || {};
        if (!cuotaId) return;

        // 1) cache byId (detalles)
        Object.values(state.byId).forEach((cliente) => {
          if (!cliente?.polizas?.length) return;
          cliente.polizas.forEach((poliza) => {
            const cuota = poliza.cuotas?.find((c) => c.id === cuotaId);
            if (cuota) {
              cuota.pagado = true;
              if (fecha_pago) cuota.fecha_pago = fecha_pago;
            }
          });
        });

        // 2) lista (si por algún motivo venía con polizas/cuotas)
        state.clientes.forEach((cliente) => {
          if (!cliente?.polizas?.length) return;
          cliente.polizas.forEach((poliza) => {
            const cuota = poliza.cuotas?.find((c) => c.id === cuotaId);
            if (cuota) {
              cuota.pagado = true;
              if (fecha_pago) cuota.fecha_pago = fecha_pago;
            }
          });
        });
      });
  },
});

export const {
  setSearch,
  setPage,
  setEstado,
  setPageSize,
  setOrdering,
  clearClienteCache,
} = clientesSlice.actions;

export default clientesSlice.reducer;
