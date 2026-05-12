// src/store/slices/balanceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; 

/**
 * 🔐 Función auxiliar para obtener el token del almacenamiento local.
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token"); 
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// =============== THUNKS ===============

// GET datos del balance diario
export const fetchBalanceDiario = createAsyncThunk(
  "balance/fetchDiario",
  async ({ fecha, oficina } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (fecha) params.fecha = fecha;
      if (oficina !== undefined && oficina !== null && oficina !== 'ALL') {
        params.oficina = oficina;
      }

      const res = await axios.get(`${BASE_URL}balance-diario/`, { 
        params,
        headers: getAuthHeaders() 
      });
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al obtener el balance diario";
      return rejectWithValue(msg);
    }
  }
);

// POST: enviar por WhatsApp
export const enviarBalanceWhatsapp = createAsyncThunk(
  "balance/enviarWhatsapp",
  async ({ fecha, destinatario, oficina } = {}, { rejectWithValue }) => {
    try {
      const payload = {};
      if (fecha) payload.fecha = fecha;
      if (destinatario) payload.destinatario = destinatario;
      if (oficina && oficina !== 'ALL') payload.oficina = oficina;

      const res = await axios.post(`${BASE_URL}balance-diario/enviar/`, payload, {
        headers: getAuthHeaders() 
      });
      return res.data; 
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "No se pudo enviar el balance por WhatsApp";
      return rejectWithValue(msg);
    }
  }
);

// GET Categorías Oficiales
export const fetchCategorias = createAsyncThunk(
  "balance/fetchCategorias",
  async (tipo, { rejectWithValue }) => {
    try {
      const params = tipo ? { tipo } : {};
      const res = await axios.get(`${BASE_URL}categorias/`, {
        params,
        headers: getAuthHeaders(),
      });
      return res.data.results || res.data; 
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener categorías");
    }
  }
);

// POST Crear Categoría Oficial
export const createCategoria = createAsyncThunk(
  "balance/createCategoria",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}categorias/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear categoría");
    }
  }
);

// DELETE Eliminar Categoría
export const deleteCategoria = createAsyncThunk(
  "balance/deleteCategoria",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}categorias/${id}/`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al eliminar categoría");
    }
  }
);

// 🚀 NUEVO: GET Lista de Oficinas (Para el selector de admin)
export const fetchOficinasList = createAsyncThunk(
  "balance/fetchOficinasList",
  async (_, { rejectWithValue }) => {
    try {
      // Ajusta la ruta a 'usuarios/oficinas/' si en tu backend está allí
      const res = await axios.get(`${BASE_URL}oficinas/`, {
        headers: getAuthHeaders(),
      });
      return res.data.results || res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar las oficinas");
    }
  }
);

// 🚀 NUEVO: POST Crear un Ingreso
export const createIngreso = createAsyncThunk(
  "balance/createIngreso",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}ingresos/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al registrar el ingreso");
    }
  }
);

// 🚀 NUEVO: POST Crear un Egreso
export const createEgreso = createAsyncThunk(
  "balance/createEgreso",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}egresos/`, data, {
        headers: getAuthHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al registrar el egreso");
    }
  }
);

// =============== SLICE ===============
// ── Historial de ingresos (con filtros completos) ──────────────────
export const fetchHistorialIngresos = createAsyncThunk(
  "balance/fetchHistorialIngresos",
  async ({ oficina, desde, hasta, forma_pago, q, page = 1, page_size = 50 } = {}, { rejectWithValue }) => {
    try {
      const params = { page, page_size };
      if (oficina && oficina !== "ALL") params.oficina = oficina;
      if (desde)      params.fecha__gte = desde;
      if (hasta)      params.fecha__lte = hasta;
      if (forma_pago && forma_pago !== "TODAS") params.forma_pago = forma_pago.toLowerCase();
      if (q)          params.search = q;
      const res = await axios.get(`${BASE_URL}ingresos/`, { params, headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al obtener historial");
    }
  }
);

// ── Exportar historial a Excel ────────────────────────────────────
export const exportHistorialExcel = createAsyncThunk(
  "balance/exportHistorialExcel",
  async ({ oficina, desde, hasta, forma_pago, q } = {}, { rejectWithValue }) => {
    try {
      const params = { formato: "excel", page_size: 9999 };
      if (oficina && oficina !== "ALL") params.oficina = oficina;
      if (desde)      params.fecha__gte = desde;
      if (hasta)      params.fecha__lte = hasta;
      if (forma_pago && forma_pago !== "TODAS") params.forma_pago = forma_pago.toLowerCase();
      if (q)          params.search = q;
      const res = await axios.get(`${BASE_URL}ingresos/export/`, {
        params, headers: getAuthHeaders(), responseType: "blob"
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      const hoy = new Date().toISOString().slice(0, 10);
      a.download = `Historial_Pagos_${hoy}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    } catch (err) {
      return rejectWithValue("No se pudo descargar el Excel");
    }
  }
);

const initialState = {
  data: null,
  status: "idle",
  error: null,
  
  envioStatus: "idle",
  envioError: null,
  mensajeEnviado: null,
  
  categorias: [],
  categoriasStatus: "idle",

  oficinas: [],
  oficinasStatus: "idle",

  // Historial de ingresos
  historialItems: [],
  historialCount: 0,
  historialNext: null,
  historialPrev: null,
  historialStatus: "idle",
};

const balanceSlice = createSlice({
  name: "balance",
  initialState,
  reducers: {
    clearEnvioState: (state) => {
      state.envioStatus = "idle";
      state.envioError = null;
      state.mensajeEnviado = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Balance Diario ---
      .addCase(fetchBalanceDiario.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBalanceDiario.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload; 
      })
      .addCase(fetchBalanceDiario.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || "Error desconocido";
      })

      // --- WhatsApp ---
      .addCase(enviarBalanceWhatsapp.pending, (state) => {
        state.envioStatus = "loading";
        state.envioError = null;
        state.mensajeEnviado = null;
      })
      .addCase(enviarBalanceWhatsapp.fulfilled, (state, action) => {
        state.envioStatus = "succeeded";
        state.mensajeEnviado = action.payload?.detail || "Balance enviado correctamente";
      })
      .addCase(enviarBalanceWhatsapp.rejected, (state, action) => {
        state.envioStatus = "failed";
        state.envioError = action.payload || action.error?.message || "Error desconocido";
      })

      // --- Categorías ---
      .addCase(fetchCategorias.pending, (state) => {
        state.categoriasStatus = "loading";
      })
      .addCase(fetchCategorias.fulfilled, (state, action) => {
        state.categoriasStatus = "succeeded";
        state.categorias = action.payload; 
      })
      .addCase(fetchCategorias.rejected, (state) => {
        state.categoriasStatus = "failed";
      })
      .addCase(createCategoria.fulfilled, (state, action) => {
        state.categorias.push(action.payload);
      })
      .addCase(deleteCategoria.fulfilled, (state, action) => {
        state.categorias = state.categorias.filter((c) => c.id !== action.payload);
      })

      // --- Oficinas ---
      .addCase(fetchOficinasList.pending, (state) => {
        state.oficinasStatus = "loading";
      })
      .addCase(fetchOficinasList.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        state.oficinas = action.payload;
      })
      .addCase(fetchOficinasList.rejected, (state) => {
        state.oficinasStatus = "failed";
      })

      // --- Historial Ingresos ---
      .addCase(fetchHistorialIngresos.pending, (state) => {
        state.historialStatus = "loading";
      })
      .addCase(fetchHistorialIngresos.fulfilled, (state, action) => {
        state.historialStatus = "succeeded";
        const data = action.payload;
        state.historialItems = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        state.historialCount = data.count ?? state.historialItems.length;
        state.historialNext  = data.next  ?? null;
        state.historialPrev  = data.previous ?? null;
      })
      .addCase(fetchHistorialIngresos.rejected, (state) => {
        state.historialStatus = "failed";
      });
  },
});

export const { clearEnvioState } = balanceSlice.actions;
export default balanceSlice.reducer;