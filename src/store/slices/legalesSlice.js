// src/store/slices/legalesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const unwrapList = (data) => {
  if (Array.isArray(data)) return { results: data, count: data.length };
  if (data && Array.isArray(data.results)) {
    return { results: data.results, count: data.count ?? data.results.length };
  }
  return { results: [], count: 0 };
};

const unwrapItem = (data) => {
  if (Array.isArray(data)) return data[0] || null;
  if (data && Array.isArray(data.results)) return data.results[0] || null;
  return data;
};

const keyOf = (id) => String(id);

// ──────────────────────────────────────────────────────────────────
// EXPEDIENTES
// ──────────────────────────────────────────────────────────────────

export const fetchExpedientes = createAsyncThunk(
  "legales/fetchExpedientes",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("legales/expedientes/", { params });
      return unwrapList(res.data);
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener los expedientes");
    }
  }
);

export const fetchExpediente = createAsyncThunk(
  "legales/fetchExpediente",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`legales/expedientes/${id}/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener el expediente");
    }
  }
);

export const fetchResumen = createAsyncThunk(
  "legales/fetchResumen",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("legales/expedientes/resumen/", { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener el resumen");
    }
  }
);

export const createExpediente = createAsyncThunk(
  "legales/createExpediente",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("legales/expedientes/", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear el expediente");
    }
  }
);

export const updateExpediente = createAsyncThunk(
  "legales/updateExpediente",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`legales/expedientes/${id}/`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al actualizar el expediente");
    }
  }
);

export const removeExpediente = createAsyncThunk(
  "legales/removeExpediente",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`legales/expedientes/${id}/`);
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al borrar el expediente");
    }
  }
);

// 🔗 Link público "Mi caso" (se genera solo si hacía falta). Se usa para
// copiarlo y mandarlo a mano por WhatsApp — no se guarda en el estado.
export const fetchPortalLink = createAsyncThunk(
  "legales/fetchPortalLink",
  async (expedienteId, { rejectWithValue }) => {
    try {
      const res = await api.get(`legales/expedientes/${expedienteId}/portal_link/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener el link");
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// ABOGADOS
// ──────────────────────────────────────────────────────────────────

export const fetchAbogados = createAsyncThunk(
  "legales/fetchAbogados",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("legales/abogados/");
      return unwrapList(res.data).results;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener los abogados");
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// MOVIMIENTOS (bitácora)
// ──────────────────────────────────────────────────────────────────

export const fetchMovimientos = createAsyncThunk(
  "legales/fetchMovimientos",
  async (expedienteId, { rejectWithValue }) => {
    try {
      const res = await api.get(`legales/expedientes/${expedienteId}/movimientos/`);
      return { expedienteId, items: unwrapList(res.data).results };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener la bitácora");
    }
  }
);

export const addMovimiento = createAsyncThunk(
  "legales/addMovimiento",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("legales/movimientos/", payload);
      return unwrapItem(res.data);
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al guardar el movimiento");
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// VENCIMIENTOS
// ──────────────────────────────────────────────────────────────────

export const fetchVencimientos = createAsyncThunk(
  "legales/fetchVencimientos",
  async (expedienteId, { rejectWithValue }) => {
    try {
      const res = await api.get(`legales/expedientes/${expedienteId}/vencimientos/`);
      return { expedienteId, items: unwrapList(res.data).results };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener los vencimientos");
    }
  }
);

export const addVencimiento = createAsyncThunk(
  "legales/addVencimiento",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("legales/vencimientos/", payload);
      return unwrapItem(res.data);
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al guardar el vencimiento");
    }
  }
);

export const updateVencimiento = createAsyncThunk(
  "legales/updateVencimiento",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`legales/vencimientos/${id}/`, data);
      return unwrapItem(res.data);
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al actualizar el vencimiento");
    }
  }
);

export const removeVencimiento = createAsyncThunk(
  "legales/removeVencimiento",
  async ({ id, expedienteId }, { rejectWithValue }) => {
    try {
      await api.delete(`legales/vencimientos/${id}/`);
      return { id, expedienteId };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al borrar el vencimiento");
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// DOCUMENTOS
// ──────────────────────────────────────────────────────────────────

export const fetchDocumentos = createAsyncThunk(
  "legales/fetchDocumentos",
  async (expedienteId, { rejectWithValue }) => {
    try {
      const res = await api.get(`legales/expedientes/${expedienteId}/documentos/`);
      return { expedienteId, items: unwrapList(res.data).results };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener los documentos");
    }
  }
);

export const addDocumento = createAsyncThunk(
  "legales/addDocumento",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("legales/documentos/", payload);
      return unwrapItem(res.data);
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al guardar el documento");
    }
  }
);

export const removeDocumento = createAsyncThunk(
  "legales/removeDocumento",
  async ({ id, expedienteId }, { rejectWithValue }) => {
    try {
      await api.delete(`legales/documentos/${id}/`);
      return { id, expedienteId };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al borrar el documento");
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// SLICE
// ──────────────────────────────────────────────────────────────────

const legalesSlice = createSlice({
  name: "legales",
  initialState: {
    expedientes: [],
    count: 0,
    loading: false,
    error: null,

    actual: null,
    actualLoading: false,

    resumen: { abiertos: 0, sin_abogado: 0, vencen_pronto: 0, cobrados: 0 },
    resumenLoading: false,

    abogados: [],
    abogadosLoading: false,

    movimientos: {},
    movimientosLoading: {},

    vencimientos: {},
    vencimientosLoading: {},

    documentos: {},
    documentosLoading: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ── EXPEDIENTES: LIST ──
      .addCase(fetchExpedientes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpedientes.fulfilled, (state, action) => {
        state.loading = false;
        state.expedientes = action.payload.results;
        state.count = action.payload.count;
      })
      .addCase(fetchExpedientes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error";
      })

      // ── EXPEDIENTES: DETALLE ──
      .addCase(fetchExpediente.pending, (state) => {
        state.actualLoading = true;
      })
      .addCase(fetchExpediente.fulfilled, (state, action) => {
        state.actualLoading = false;
        state.actual = action.payload;
        if (action.payload?.id != null) {
          const idx = state.expedientes.findIndex((e) => e.id === action.payload.id);
          if (idx !== -1) state.expedientes[idx] = action.payload;
        }
      })
      .addCase(fetchExpediente.rejected, (state) => {
        state.actualLoading = false;
      })

      // ── EXPEDIENTES: RESUMEN ──
      .addCase(fetchResumen.pending, (state) => {
        state.resumenLoading = true;
      })
      .addCase(fetchResumen.fulfilled, (state, action) => {
        state.resumenLoading = false;
        state.resumen = action.payload || state.resumen;
      })
      .addCase(fetchResumen.rejected, (state) => {
        state.resumenLoading = false;
      })

      // ── EXPEDIENTES: CREATE ──
      .addCase(createExpediente.fulfilled, (state, action) => {
        if (action.payload?.id != null) {
          state.expedientes.unshift(action.payload);
          state.count += 1;
        }
      })

      // ── EXPEDIENTES: UPDATE ──
      .addCase(updateExpediente.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload || payload.id == null) return;
        const idx = state.expedientes.findIndex((e) => e.id === payload.id);
        if (idx !== -1) state.expedientes[idx] = payload;
        if (state.actual?.id === payload.id) state.actual = payload;
      })

      // ── EXPEDIENTES: DELETE ──
      .addCase(removeExpediente.fulfilled, (state, action) => {
        const id = action.payload;
        state.expedientes = state.expedientes.filter((e) => e.id !== id);
        if (state.actual?.id === id) state.actual = null;
        const k = keyOf(id);
        delete state.movimientos[k];
        delete state.vencimientos[k];
        delete state.documentos[k];
      })

      // ── ABOGADOS ──
      .addCase(fetchAbogados.pending, (state) => {
        state.abogadosLoading = true;
      })
      .addCase(fetchAbogados.fulfilled, (state, action) => {
        state.abogadosLoading = false;
        state.abogados = action.payload || [];
      })
      .addCase(fetchAbogados.rejected, (state) => {
        state.abogadosLoading = false;
      })

      // ── MOVIMIENTOS: LIST ──
      .addCase(fetchMovimientos.pending, (state, action) => {
        state.movimientosLoading[keyOf(action.meta.arg)] = true;
      })
      .addCase(fetchMovimientos.fulfilled, (state, action) => {
        const k = keyOf(action.payload.expedienteId);
        state.movimientosLoading[k] = false;
        state.movimientos[k] = action.payload.items;
      })
      .addCase(fetchMovimientos.rejected, (state, action) => {
        state.movimientosLoading[keyOf(action.meta.arg)] = false;
      })

      // ── MOVIMIENTOS: ADD ──
      .addCase(addMovimiento.fulfilled, (state, action) => {
        const m = action.payload;
        if (!m || m.expediente == null) return;
        const k = keyOf(m.expediente);
        if (!state.movimientos[k]) state.movimientos[k] = [];
        state.movimientos[k].unshift(m);
        const idx = state.expedientes.findIndex((e) => e.id === m.expediente);
        if (idx !== -1) {
          state.expedientes[idx].movimientos_count = (state.expedientes[idx].movimientos_count || 0) + 1;
        }
      })

      // ── VENCIMIENTOS: LIST ──
      .addCase(fetchVencimientos.pending, (state, action) => {
        state.vencimientosLoading[keyOf(action.meta.arg)] = true;
      })
      .addCase(fetchVencimientos.fulfilled, (state, action) => {
        const k = keyOf(action.payload.expedienteId);
        state.vencimientosLoading[k] = false;
        state.vencimientos[k] = action.payload.items;
      })
      .addCase(fetchVencimientos.rejected, (state, action) => {
        state.vencimientosLoading[keyOf(action.meta.arg)] = false;
      })

      // ── VENCIMIENTOS: ADD ──
      .addCase(addVencimiento.fulfilled, (state, action) => {
        const v = action.payload;
        if (!v || v.expediente == null) return;
        const k = keyOf(v.expediente);
        if (!state.vencimientos[k]) state.vencimientos[k] = [];
        state.vencimientos[k].push(v);
        state.vencimientos[k].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      })

      // ── VENCIMIENTOS: UPDATE ──
      .addCase(updateVencimiento.fulfilled, (state, action) => {
        const v = action.payload;
        if (!v || v.expediente == null) return;
        const k = keyOf(v.expediente);
        const arr = state.vencimientos[k] || [];
        const idx = arr.findIndex((x) => x.id === v.id);
        if (idx !== -1) arr[idx] = v;
      })

      // ── VENCIMIENTOS: DELETE ──
      .addCase(removeVencimiento.fulfilled, (state, action) => {
        const { id, expedienteId } = action.payload;
        const k = keyOf(expedienteId);
        if (state.vencimientos[k]) {
          state.vencimientos[k] = state.vencimientos[k].filter((v) => v.id !== id);
        }
      })

      // ── DOCUMENTOS: LIST ──
      .addCase(fetchDocumentos.pending, (state, action) => {
        state.documentosLoading[keyOf(action.meta.arg)] = true;
      })
      .addCase(fetchDocumentos.fulfilled, (state, action) => {
        const k = keyOf(action.payload.expedienteId);
        state.documentosLoading[k] = false;
        state.documentos[k] = action.payload.items;
      })
      .addCase(fetchDocumentos.rejected, (state, action) => {
        state.documentosLoading[keyOf(action.meta.arg)] = false;
      })

      // ── DOCUMENTOS: ADD ──
      .addCase(addDocumento.fulfilled, (state, action) => {
        const d = action.payload;
        if (!d || d.expediente == null) return;
        const k = keyOf(d.expediente);
        if (!state.documentos[k]) state.documentos[k] = [];
        state.documentos[k].unshift(d);
      })

      // ── DOCUMENTOS: DELETE ──
      .addCase(removeDocumento.fulfilled, (state, action) => {
        const { id, expedienteId } = action.payload;
        const k = keyOf(expedienteId);
        if (state.documentos[k]) {
          state.documentos[k] = state.documentos[k].filter((d) => d.id !== id);
        }
      });
  },
});

export default legalesSlice.reducer;