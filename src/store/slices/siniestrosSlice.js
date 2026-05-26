// src/store/slices/siniestrosSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────────
// 🛡️ HELPERS
// ──────────────────────────────────────────────────────────────────

/** Token desde localStorage (compat con ambas claves). */
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * 🐛 FIX: Normaliza la respuesta del backend.
 * - Si es paginada DRF: { results: [...] } → devolvemos el array.
 * - Si es array plano: lo devolvemos tal cual.
 * - Si es objeto puro (create/update/delete): lo devolvemos tal cual.
 *
 * Antes hacíamos `response.data.results || response.data` en cada lugar,
 * lo que rompía mutaciones cuando el back devolvía paginación inesperada.
 */
const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

/** Para mutaciones (POST/PUT) que devuelven UN objeto, nunca array. */
const unwrapItem = (data) => {
  // Si por error vino un array (paginación accidental), tomamos el primero.
  if (Array.isArray(data)) return data[0] || null;
  if (data && Array.isArray(data.results)) return data.results[0] || null;
  return data;
};

/** Normaliza la key del evento a string siempre (evita doble entrada en state.eventos). */
const keyOf = (id) => String(id);

// ──────────────────────────────────────────────────────────────────
// 📦 THUNKS — SINIESTROS
// ──────────────────────────────────────────────────────────────────

export const getSiniestros = createAsyncThunk(
  'siniestros/getSiniestros',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}siniestros/`, {
        headers: getAuthHeaders(),
      });
      return unwrapList(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener los siniestros');
    }
  }
);

export const addSiniestro = createAsyncThunk(
  'siniestros/addSiniestro',
  async (siniestro, { rejectWithValue }) => {
    // 🐛 DEBUG: log del payload exacto que mandamos
    console.group("🚨 [addSiniestro] POST /api/siniestros/");
    console.log("📦 Payload enviado:", siniestro);
    console.log("📦 Payload JSON:", JSON.stringify(siniestro, null, 2));
    console.log("🔑 Headers:", getAuthHeaders());
    console.log("🌐 URL:", `${BASE_URL}siniestros/`);
    console.groupEnd();

    try {
      const response = await axios.post(`${BASE_URL}siniestros/`, siniestro, {
        headers: getAuthHeaders(),
      });
      console.log("✅ [addSiniestro] OK", response.data);
      return unwrapItem(response.data);
    } catch (error) {
      // 🐛 DEBUG: log completo del error
      console.group("❌ [addSiniestro] ERROR 400");
      console.error("Status:", error.response?.status);
      console.error("Status text:", error.response?.statusText);
      console.error("Response data:", error.response?.data);
      console.error("Response JSON:", JSON.stringify(error.response?.data, null, 2));
      console.error("Headers:", error.response?.headers);
      console.error("Full error:", error);
      console.groupEnd();

      return rejectWithValue(error.response?.data || 'Error al crear el siniestro');
    }
  }
);

export const editSiniestro = createAsyncThunk(
  'siniestros/editSiniestro',
  async ({ id, siniestro }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${BASE_URL}siniestros/${id}/`, siniestro, {
        headers: getAuthHeaders(),
      });
      return unwrapItem(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al actualizar el siniestro');
    }
  }
);

export const removeSiniestro = createAsyncThunk(
  'siniestros/removeSiniestro',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}siniestros/${id}/`, {
        headers: getAuthHeaders(),
      });
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al eliminar el siniestro');
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// ⏱️ THUNKS — EVENTOS (BITÁCORA)
// ──────────────────────────────────────────────────────────────────

export const addEvento = createAsyncThunk(
  'siniestros/addEvento',
  async (evento, { rejectWithValue }) => {
    try {
      // 🐛 FIX: ruta actualizada al nuevo basename del router.
      const response = await axios.post(`${BASE_URL}siniestro-eventos/`, evento, {
        headers: getAuthHeaders(),
      });
      return unwrapItem(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al crear el evento del siniestro');
    }
  }
);

export const getEventosBySiniestro = createAsyncThunk(
  'siniestros/getEventosBySiniestro',
  async (siniestroId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}siniestros/${siniestroId}/eventos/`, {
        headers: getAuthHeaders(),
      });
      return unwrapList(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener los eventos del siniestro');
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// 📸 THUNKS — FOTOS (GALERÍA)
// ──────────────────────────────────────────────────────────────────

/** Listar fotos de un siniestro */
export const getFotosBySiniestro = createAsyncThunk(
  'siniestros/getFotosBySiniestro',
  async (siniestroId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}siniestro-fotos/`, {
        headers: getAuthHeaders(),
        params: { siniestro: siniestroId, page_size: 200 },
      });
      return unwrapList(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener las fotos del siniestro');
    }
  }
);

/**
 * Crear foto.
 * El archivo se sube primero a Cloudinary desde el componente; acá solo
 * mandamos la metadata (url, public_id) al backend.
 */
export const addFoto = createAsyncThunk(
  'siniestros/addFoto',
  async (fotoData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${BASE_URL}siniestro-fotos/`, fotoData, {
        headers: getAuthHeaders(),
      });
      return unwrapItem(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al guardar la foto');
    }
  }
);

/** Borrar foto (solo admin). */
export const removeFoto = createAsyncThunk(
  'siniestros/removeFoto',
  async ({ fotoId, siniestroId }, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}siniestro-fotos/${fotoId}/`, {
        headers: getAuthHeaders(),
      });
      return { fotoId, siniestroId };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al eliminar la foto');
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// 🧩 SLICE
// ──────────────────────────────────────────────────────────────────

const siniestrosSlice = createSlice({
  name: 'siniestros',
  initialState: {
    siniestros: [],
    eventos: {},          // { [siniestroId: string]: Evento[] }
    eventosLoading: {},   // { [siniestroId: string]: boolean }
    eventosError: {},     // { [siniestroId: string]: string|null }
    // 📸 Fotos por siniestro
    fotos: {},            // { [siniestroId: string]: Foto[] }
    fotosLoading: {},     // { [siniestroId: string]: boolean }
    fotosError: {},       // { [siniestroId: string]: string|null }
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ── LIST ───────────────────────────────────────
      .addCase(getSiniestros.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSiniestros.fulfilled, (state, action) => {
        state.loading = false;
        // 🐛 FIX: garantizamos que siempre sea array, jamás un objeto paginado.
        state.siniestros = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getSiniestros.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error';
      })

      // ── CREATE ─────────────────────────────────────
      .addCase(addSiniestro.fulfilled, (state, action) => {
        if (action.payload && action.payload.id != null) {
          state.siniestros.unshift(action.payload);
        }
      })

      // ── UPDATE ─────────────────────────────────────
      .addCase(editSiniestro.fulfilled, (state, action) => {
        if (!action.payload || action.payload.id == null) return;
        const index = state.siniestros.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.siniestros[index] = action.payload;
      })

      // ── DELETE ─────────────────────────────────────
      .addCase(removeSiniestro.fulfilled, (state, action) => {
        const id = action.payload;
        state.siniestros = state.siniestros.filter((s) => s.id !== id);
        // 🐛 FIX: limpiamos eventos huérfanos del siniestro borrado.
        delete state.eventos[keyOf(id)];
        delete state.eventosLoading[keyOf(id)];
        delete state.eventosError[keyOf(id)];
        // 📸 Limpiamos fotos huérfanas del siniestro borrado.
        delete state.fotos[keyOf(id)];
        delete state.fotosLoading[keyOf(id)];
        delete state.fotosError[keyOf(id)];
      })

      // ── EVENTOS: ADD ───────────────────────────────
      .addCase(addEvento.fulfilled, (state, action) => {
        const evento = action.payload;
        if (!evento) return;

        // El backend devuelve "siniestro" (id puro). Si por compat antigua viene
        // "siniestro_id", también lo aceptamos.
        const sid = evento.siniestro ?? evento.siniestro_id;
        if (sid == null) return;

        const k = keyOf(sid);
        if (!state.eventos[k]) state.eventos[k] = [];
        state.eventos[k].unshift(evento);
      })

      // ── EVENTOS: LIST ──────────────────────────────
      .addCase(getEventosBySiniestro.pending, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.eventosLoading[k] = true;
        state.eventosError[k] = null;
      })
      .addCase(getEventosBySiniestro.fulfilled, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.eventos[k] = Array.isArray(action.payload) ? action.payload : [];
        state.eventosLoading[k] = false;
      })
      .addCase(getEventosBySiniestro.rejected, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.eventosLoading[k] = false;
        state.eventosError[k] = action.payload || 'Error';
      })

      // ── 📸 FOTOS: LIST ─────────────────────────────
      .addCase(getFotosBySiniestro.pending, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.fotosLoading[k] = true;
        state.fotosError[k] = null;
      })
      .addCase(getFotosBySiniestro.fulfilled, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.fotos[k] = Array.isArray(action.payload) ? action.payload : [];
        state.fotosLoading[k] = false;
      })
      .addCase(getFotosBySiniestro.rejected, (state, action) => {
        const k = keyOf(action.meta.arg);
        state.fotosLoading[k] = false;
        state.fotosError[k] = action.payload || 'Error';
      })

      // ── 📸 FOTOS: ADD ──────────────────────────────
      .addCase(addFoto.fulfilled, (state, action) => {
        const foto = action.payload;
        if (!foto) return;
        const sid = foto.siniestro ?? foto.siniestro_id;
        if (sid == null) return;
        const k = keyOf(sid);
        if (!state.fotos[k]) state.fotos[k] = [];
        state.fotos[k].unshift(foto);

        // Si el siniestro está en la lista, actualizamos fotos_count
        const idx = state.siniestros.findIndex((s) => s.id === Number(sid));
        if (idx !== -1) {
          state.siniestros[idx] = {
            ...state.siniestros[idx],
            fotos_count: (state.siniestros[idx].fotos_count || 0) + 1,
          };
        }
      })

      // ── 📸 FOTOS: DELETE ───────────────────────────
      .addCase(removeFoto.fulfilled, (state, action) => {
        const { fotoId, siniestroId } = action.payload;
        const k = keyOf(siniestroId);
        if (state.fotos[k]) {
          state.fotos[k] = state.fotos[k].filter((f) => f.id !== fotoId);
        }
        const idx = state.siniestros.findIndex((s) => s.id === Number(siniestroId));
        if (idx !== -1 && state.siniestros[idx].fotos_count > 0) {
          state.siniestros[idx] = {
            ...state.siniestros[idx],
            fotos_count: state.siniestros[idx].fotos_count - 1,
          };
        }
      });
  },
});

export default siniestrosSlice.reducer;