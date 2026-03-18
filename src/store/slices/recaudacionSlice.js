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

const recaudacionSlice = createSlice({
  name: "recaudacion",
  initialState: {
    items: [],
    loading: false,
    error: null,
    uploading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
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
      // Upload
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
      });
  },
});

export default recaudacionSlice.reducer;