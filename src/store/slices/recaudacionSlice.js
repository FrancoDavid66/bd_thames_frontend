// src/store/slices/recaudacionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// GET: Traer recaudaciones (Admin)
export const fetchRecaudaciones = createAsyncThunk(
  "recaudacion/fetchAll",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("recaudacion/", { params: filters });
      return Array.isArray(res.data?.results) ? res.data.results : res.data || [];
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
        state.items = action.payload;
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
        // Lo agregamos al principio de la lista
        state.items.unshift(action.payload);
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