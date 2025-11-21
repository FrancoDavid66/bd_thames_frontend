// src/store/slices/clientesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/** Base URL robusta:
 * - Usa VITE_API_URL si existe
 * - Si no, cae a '/api/'
 * - Garantiza la barra final
 */
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

// Instancia axios consistente
const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

/* ============ THUNKS ============ */

// Listado: página, búsqueda y estado ("todos" | "activos" | "inactivos")
// ✅ Acepta y envía page_size al backend
export const fetchClientes = createAsyncThunk(
  "clientes/fetchClientes",
  async ({ page = 1, page_size, search = "", estado = "todos" }, { rejectWithValue }) => {
    try {
      const params = { page, search };
      if (page_size) params.page_size = page_size;
      if (estado && estado !== "todos") params.estado = estado;

      const { data } = await http.get("clientes/", { params });
      // data = { results, count, next, previous }
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error al obtener clientes");
    }
  }
);

// Crear
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

// Actualizar parcial (PATCH) — ej: { id, archivo_dni_frente }
export const updateCliente = createAsyncThunk(
  "clientes/updateCliente",
  async ({ id, ...partial }, { rejectWithValue }) => {
    try {
      if (!id) throw new Error("Falta id de cliente");
      const { data } = await http.patch(`clientes/${id}/`, partial);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Error al actualizar cliente");
    }
  }
);

// Eliminar
export const deleteCliente = createAsyncThunk(
  "clientes/deleteCliente",
  async (id, { rejectWithValue }) => {
    try {
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

/* ============ SLICE ============ */

const initialState = {
  clientes: [],
  count: 0,
  next: null,
  previous: null,
  page: 1,
  search: "",
  estado: "todos",
  status: "idle",
  error: null,
};

const clientesSlice = createSlice({
  name: "clientes",
  initialState,
  reducers: {
    setSearch(state, action) {
      state.search = action.payload ?? "";
    },
    setPage(state, action) {
      state.page = Number(action.payload) || 1;
    },
    setEstado(state, action) {
      state.estado = action.payload || "todos";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchClientes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.clientes = action.payload.results || [];
        state.count = action.payload.count ?? 0;
        state.next = action.payload.next || null;
        state.previous = action.payload.previous || null;
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Error";
      })
      .addCase(createCliente.fulfilled, (state, action) => {
        state.clientes.unshift(action.payload);
        state.count += 1;
      })
      .addCase(updateCliente.fulfilled, (state, action) => {
        const idx = state.clientes.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.clientes[idx] = action.payload;
      })
      .addCase(deleteCliente.fulfilled, (state, action) => {
        const id = action.payload.id;
        state.clientes = state.clientes.filter((c) => c.id !== id);
        state.count = Math.max(0, state.count - 1);
      })
      .addCase(pagarCuota.fulfilled, (state, action) => {
        const { cuotaId, fecha_pago } = action.payload || {};
        state.clientes.forEach((cliente) => {
          cliente.polizas?.forEach((poliza) => {
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

export const { setSearch, setPage, setEstado } = clientesSlice.actions;
export default clientesSlice.reducer;
