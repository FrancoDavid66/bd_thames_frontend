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

// 🆕 09/10: de a 500 por pedido (el máximo que acepta el servidor).
const POR_PAGINA = 500;

/**
 * Trae TODOS los siniestros, página por página.
 * 🐛 FIX 09/10: antes pedía solo la 1ª página (100): si había 150 siniestros,
 *    los 50 más viejos no aparecían en ningún lado y nadie se enteraba.
 *    Ej: 1.200 siniestros → 3 pedidos (500 + 500 + 200).
 */
export const getSiniestros = createAsyncThunk(
  'siniestros/getSiniestros',
  async (_, { rejectWithValue }) => {
    try {
      // Map por id: si alguien carga un siniestro mientras se pide la página 2,
      // la lista se corre uno y vendría repetido → acá se guarda una sola vez.
      const porId = new Map();
      for (let page = 1; page <= 40; page++) {
        let data;
        try {
          const response = await axios.get(`${BASE_URL}siniestros/`, {
            headers: getAuthHeaders(),
            params: { page, page_size: POR_PAGINA },
          });
          data = response.data;
        } catch (err) {
          // Si borraron siniestros en el medio, la última página puede ya no
          // existir (404): nos quedamos con lo que ya llegó.
          if (page > 1 && err?.response?.status === 404) break;
          throw err;
        }
        if (Array.isArray(data)) return data; // sin paginación: ya vino todo
        const lote = unwrapList(data);
        lote.forEach((s, i) => porId.set(s?.id ?? `sin-id-${page}-${i}`, s));
        const total = Number(data?.count);
        if (!data?.next || !lote.length || (Number.isFinite(total) && porId.size >= total)) break;
      }
      return [...porId.values()];
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al obtener los siniestros');
    }
  }
);

export const addSiniestro = createAsyncThunk(
  'siniestros/addSiniestro',
  async (siniestro, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${BASE_URL}siniestros/`, siniestro, {
        headers: getAuthHeaders(),
      });
      return unwrapItem(response.data);
    } catch (error) {
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

/**
 * 🆕 09/10: cambia SOLO algunos campos (PATCH). Lo usa la planilla de colores para
 * pasar de estado o cargar el N° de reclamo sin mandar todo el siniestro.
 * Ej: dispatch(patchSiniestro({ id: 12, cambios: { estado: "DENUNCIADO" } }))
 */
export const patchSiniestro = createAsyncThunk(
  'siniestros/patchSiniestro',
  async ({ id, cambios }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${BASE_URL}siniestros/${id}/`, cambios, {
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

/**
 * 🏷️ Cambiar la etiqueta de una foto (o quitarla con etiqueta = "").
 * Lo puede hacer cualquiera de la oficina del siniestro.
 */
export const updateFoto = createAsyncThunk(
  'siniestros/updateFoto',
  async ({ fotoId, etiqueta }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}siniestro-fotos/${fotoId}/`,
        { etiqueta: etiqueta || "" },
        { headers: getAuthHeaders() }
      );
      return unwrapItem(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error al guardar la etiqueta');
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
    reqId: null, // último pedido de la lista (para ignorar respuestas viejas)
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
      .addCase(getSiniestros.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.reqId = action.meta.requestId;
      })
      .addCase(getSiniestros.fulfilled, (state, action) => {
        if (state.reqId && action.meta.requestId !== state.reqId) return; // 📡 respuesta vieja: ya se pidió otra
        state.loading = false;
        // 🐛 FIX: garantizamos que siempre sea array, jamás un objeto paginado.
        state.siniestros = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getSiniestros.rejected, (state, action) => {
        if (state.reqId && action.meta.requestId !== state.reqId) return; // 📡 respuesta vieja: ya se pidió otra
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

      // ── UPDATE PARCIAL (planilla) ──────────────────
      .addCase(patchSiniestro.fulfilled, (state, action) => {
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

      // ── 🏷️ FOTOS: ETIQUETA ─────────────────────────
      .addCase(updateFoto.fulfilled, (state, action) => {
        const foto = action.payload;
        const { fotoId, siniestroId } = action.meta.arg;
        const sid = foto?.siniestro ?? siniestroId;
        if (sid == null) return;
        const cambio = foto && typeof foto === 'object'
          ? foto
          : { etiqueta: action.meta.arg.etiqueta || '' };
        const k = keyOf(sid);
        if (state.fotos[k]) {
          state.fotos[k] = state.fotos[k].map((f) => (f.id === fotoId ? { ...f, ...cambio } : f));
        }
        // Si el siniestro de la lista trae sus fotos adentro, también las actualizamos.
        const idx = state.siniestros.findIndex((s) => s.id === Number(sid));
        if (idx !== -1 && Array.isArray(state.siniestros[idx].fotos)) {
          state.siniestros[idx] = {
            ...state.siniestros[idx],
            fotos: state.siniestros[idx].fotos.map((f) => (f.id === fotoId ? { ...f, ...cambio } : f)),
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