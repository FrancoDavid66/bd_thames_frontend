// src/store/slices/serviciosSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL}servicios/`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ════════════════════════════════════════════════════════════════
// SERVICIOS FIJOS (plantillas)
// ════════════════════════════════════════════════════════════════
export const fetchServicios = createAsyncThunk(
  "servicios/fetchServicios",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}servicios/`, { params, headers: getAuthHeaders() });
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar servicios");
    }
  }
);

export const createServicio = createAsyncThunk(
  "servicios/createServicio",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}servicios/`, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear servicio");
    }
  }
);

export const updateServicio = createAsyncThunk(
  "servicios/updateServicio",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(`${BASE_URL}servicios/${id}/`, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al actualizar servicio");
    }
  }
);

export const deleteServicio = createAsyncThunk(
  "servicios/deleteServicio",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}servicios/${id}/`, { headers: getAuthHeaders() });
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al eliminar servicio");
    }
  }
);

export const generarPagosMes = createAsyncThunk(
  "servicios/generarPagosMes",
  async ({ anio, mes } = {}, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}servicios/generar_pagos_mes/`,
        { anio, mes },
        { headers: getAuthHeaders() }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al generar pagos");
    }
  }
);

// ════════════════════════════════════════════════════════════════
// PAGOS MENSUALES
// ════════════════════════════════════════════════════════════════
export const fetchPagosMes = createAsyncThunk(
  "servicios/fetchPagosMes",
  async ({ periodo, estado, servicio } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (periodo) params.periodo = periodo;
      if (estado && estado !== "TODOS") params.estado = estado;
      if (servicio) params.servicio = servicio;
      const res = await axios.get(`${BASE_URL}pagos/`, { params, headers: getAuthHeaders() });
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar pagos");
    }
  }
);

export const fetchResumenMes = createAsyncThunk(
  "servicios/fetchResumenMes",
  async ({ periodo } = {}, { rejectWithValue }) => {
    try {
      const params = periodo ? { periodo } : {};
      const res = await axios.get(`${BASE_URL}pagos/resumen_mes/`, { params, headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar resumen");
    }
  }
);

export const fetchContadoresServicios = createAsyncThunk(
  "servicios/fetchContadores",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}pagos/contadores/`, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      if (err?.response?.status === 403) {
        return { vencidos: 0, por_vencer: 0, total_alertas: 0, proximos: [] };
      }
      return rejectWithValue(err?.response?.data || "Error al cargar contadores");
    }
  }
);

export const registrarPagoServicio = createAsyncThunk(
  "servicios/registrarPagoServicio",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}pagos/${id}/registrar_pago/`,
        payload,
        { headers: getAuthHeaders() }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al registrar pago");
    }
  }
);

export const deshacerPagoServicio = createAsyncThunk(
  "servicios/deshacerPagoServicio",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}pagos/${id}/deshacer_pago/`,
        {},
        { headers: getAuthHeaders() }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al deshacer pago");
    }
  }
);

// ════════════════════════════════════════════════════════════════
// 🆕 CATEGORÍAS (CRUD)
// ════════════════════════════════════════════════════════════════
export const fetchCategoriasServicio = createAsyncThunk(
  "servicios/fetchCategorias",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}categorias/`, { params, headers: getAuthHeaders() });
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar categorías");
    }
  }
);

export const createCategoriaServicio = createAsyncThunk(
  "servicios/createCategoria",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}categorias/`, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al crear categoría");
    }
  }
);

export const updateCategoriaServicio = createAsyncThunk(
  "servicios/updateCategoria",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(`${BASE_URL}categorias/${id}/`, data, { headers: getAuthHeaders() });
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al actualizar categoría");
    }
  }
);

export const deleteCategoriaServicio = createAsyncThunk(
  "servicios/deleteCategoria",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}categorias/${id}/`, { headers: getAuthHeaders() });
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al eliminar categoría");
    }
  }
);

// ════════════════════════════════════════════════════════════════
// SLICE
// ════════════════════════════════════════════════════════════════
const serviciosSlice = createSlice({
  name: "servicios",
  initialState: {
    // Plantillas
    servicios: [],
    serviciosStatus: "idle",
    serviciosError: null,

    // Pagos
    pagos: [],
    pagosStatus: "idle",
    pagosError: null,

    // Resumen
    resumen: null,
    resumenStatus: "idle",

    // Contadores (badge)
    contadores: { vencidos: 0, por_vencer: 0, total_alertas: 0, proximos: [] },
    contadoresStatus: "idle",

    // 🆕 Categorías
    categorias: [],
    categoriasStatus: "idle",

    filtros: { periodo: null, estado: "TODOS", servicio: null },
    submitting: false,
  },
  reducers: {
    setFiltro(state, action) {
      state.filtros = { ...state.filtros, ...action.payload };
    },
    resetFiltros(state) {
      state.filtros = { periodo: null, estado: "TODOS", servicio: null };
    },
  },
  extraReducers: (builder) => {
    builder
      // ── SERVICIOS ─────────────────────────────────────────────
      .addCase(fetchServicios.pending, (s) => { s.serviciosStatus = "loading"; })
      .addCase(fetchServicios.fulfilled, (s, a) => {
        s.serviciosStatus = "succeeded";
        s.servicios = a.payload;
      })
      .addCase(fetchServicios.rejected, (s, a) => {
        s.serviciosStatus = "failed";
        s.serviciosError = a.payload;
      })

      .addCase(createServicio.fulfilled, (s, a) => {
        s.servicios.unshift(a.payload);
      })

      .addCase(updateServicio.fulfilled, (s, a) => {
        const idx = s.servicios.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.servicios[idx] = a.payload;
      })

      .addCase(deleteServicio.fulfilled, (s, a) => {
        s.servicios = s.servicios.filter((x) => x.id !== a.payload);
      })

      // ── PAGOS ─────────────────────────────────────────────────
      .addCase(fetchPagosMes.pending, (s) => { s.pagosStatus = "loading"; })
      .addCase(fetchPagosMes.fulfilled, (s, a) => {
        s.pagosStatus = "succeeded";
        s.pagos = a.payload;
      })
      .addCase(fetchPagosMes.rejected, (s, a) => {
        s.pagosStatus = "failed";
        s.pagosError = a.payload;
      })

      .addCase(fetchResumenMes.pending, (s) => { s.resumenStatus = "loading"; })
      .addCase(fetchResumenMes.fulfilled, (s, a) => {
        s.resumenStatus = "succeeded";
        s.resumen = a.payload;
      })

      .addCase(fetchContadoresServicios.pending, (s) => { s.contadoresStatus = "loading"; })
      .addCase(fetchContadoresServicios.fulfilled, (s, a) => {
        s.contadoresStatus = "succeeded";
        s.contadores = a.payload;
      })
      .addCase(fetchContadoresServicios.rejected, (s) => { s.contadoresStatus = "failed"; })

      .addCase(registrarPagoServicio.pending, (s) => { s.submitting = true; })
      .addCase(registrarPagoServicio.fulfilled, (s, a) => {
        s.submitting = false;
        const idx = s.pagos.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.pagos[idx] = a.payload;
      })
      .addCase(registrarPagoServicio.rejected, (s) => { s.submitting = false; })

      .addCase(deshacerPagoServicio.fulfilled, (s, a) => {
        const idx = s.pagos.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.pagos[idx] = a.payload;
      })

      // ── 🆕 CATEGORÍAS ────────────────────────────────────────
      .addCase(fetchCategoriasServicio.pending, (s) => { s.categoriasStatus = "loading"; })
      .addCase(fetchCategoriasServicio.fulfilled, (s, a) => {
        s.categoriasStatus = "succeeded";
        s.categorias = a.payload;
      })
      .addCase(fetchCategoriasServicio.rejected, (s) => { s.categoriasStatus = "failed"; })

      .addCase(createCategoriaServicio.fulfilled, (s, a) => {
        s.categorias.push(a.payload);
        s.categorias.sort((x, y) => x.nombre.localeCompare(y.nombre));
      })

      .addCase(updateCategoriaServicio.fulfilled, (s, a) => {
        const idx = s.categorias.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.categorias[idx] = a.payload;
      })

      .addCase(deleteCategoriaServicio.fulfilled, (s, a) => {
        s.categorias = s.categorias.filter((x) => x.id !== a.payload);
      });
  },
});

export const { setFiltro, resetFiltros } = serviciosSlice.actions;
export default serviciosSlice.reducer;