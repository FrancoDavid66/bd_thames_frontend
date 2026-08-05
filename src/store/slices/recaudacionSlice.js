// src/store/slices/recaudacionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// GET: Traer recaudaciones (Admin) — AHORA CON PAGINACIÓN REAL DEL BACKEND
// El backend devuelve { count, next, previous, results }. Devolvemos res.data completo
// para poder guardar tanto los results como el count en el estado.
// Si por compatibilidad la respuesta viene como array plano (sin paginar),
// la normalizamos a { results: array, count: array.length }.
export const fetchRecaudaciones = createAsyncThunk(
  "recaudacion/fetchAll",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("recaudacion/", { params: filters });
      const data = res.data;
      // Respuesta paginada (DRF): { count, next, previous, results }
      if (data && Array.isArray(data.results)) {
        return data;
      }
      // Respuesta plana (array) → la envolvemos para mantener la misma forma
      const arr = Array.isArray(data) ? data : [];
      return { results: arr, count: arr.length };
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar los registros");
    }
  }
);

// POST: Subir foto de recaudación (Usuario)
export const uploadRecaudacion = createAsyncThunk(
  "recaudacion/upload",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("recaudacion/", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al subir la recaudación");
    }
  }
);

// 🚀 NUEVO THUNK: Traer Empleados Activos para el Cierre de Caja
export const fetchEmpleadosActivos = createAsyncThunk(
  "recaudacion/fetchEmpleados",
  async (_, { rejectWithValue }) => {
    try {
      // Usamos la ruta correcta (sin 'solicitudes/')
      const res = await api.get("empleados/activos/");
      return res.data || [];
    } catch (err) {
      return rejectWithValue(err?.response?.data || "Error al cargar los empleados");
    }
  }
);

const recaudacionSlice = createSlice({
  name: "recaudacion",
  initialState: {
    items: [],
    // 🆕 Metadatos de paginación real (backend)
    count: 0,
    page: 1,
    pageSize: 12,
    loading: false,
    error: null,
    uploading: false,
    // 🚀 ESTADOS PARA EMPLEADOS
    empleados: [],
    loadingEmpleados: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Recaudaciones
      .addCase(fetchRecaudaciones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecaudaciones.fulfilled, (state, action) => {
        state.loading = false;
        // El payload ahora es { count, next, previous, results }
        const payload = action.payload || {};
        state.items = payload.results || [];
        state.count = payload.count ?? state.items.length;
      })
      .addCase(fetchRecaudaciones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Upload Recaudacion
      .addCase(uploadRecaudacion.pending, (state) => {
        state.uploading = true;
      })
      .addCase(uploadRecaudacion.fulfilled, (state, action) => {
        state.uploading = false;
        // Lo agregamos al principio de la lista (cosmético: el front refetchea después).
        // Como la lista está paginada, incrementamos el count para mantener coherencia.
        state.items.unshift(action.payload);
        state.count += 1;
      })
      .addCase(uploadRecaudacion.rejected, (state) => {
        state.uploading = false;
      })

      // 🚀 Fetch Empleados
      .addCase(fetchEmpleadosActivos.pending, (state) => {
        state.loadingEmpleados = true;
      })
      .addCase(fetchEmpleadosActivos.fulfilled, (state, action) => {
        state.loadingEmpleados = false;
        state.empleados = action.payload;
      })
      .addCase(fetchEmpleadosActivos.rejected, (state) => {
        state.loadingEmpleados = false;
      });
  },
});

export default recaudacionSlice.reducer;