// src/store/slices/competenciaSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import CompetenciaAPI from "../../api/competencia";
import toast from "react-hot-toast";

const MIS_PRECIOS_KEY = "competencia.misPrecios";

function loadMisPrecios() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MIS_PRECIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMisPrecios(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIS_PRECIOS_KEY, JSON.stringify(list || []));
  } catch {
    // noop
  }
}

function computeStats(ubicaciones) {
  const rows = Array.isArray(ubicaciones) ? ubicaciones : [];
  const totalRegistros = rows.length;

  const nombresSet = new Set();
  let sumaPrecio = 0;
  let countPrecio = 0;
  let minPrecio = null;
  let maxPrecio = null;

  const porCobertura = {};
  const porCompania = {};
  const porCiudad = {};
  const preciosCobertura = {};
  const preciosCompania = {};

  for (const row of rows) {
    if (row.nombre) nombresSet.add(row.nombre);

    const precio =
      row.precio !== null && row.precio !== undefined
        ? Number(row.precio)
        : null;
    const cobertura = row.cobertura || "";
    const compania = row.compania || "";
    const ciudad = row.ciudad || "";

    if (!isNaN(precio) && precio != null) {
      sumaPrecio += precio;
      countPrecio += 1;
      if (minPrecio === null || precio < minPrecio) minPrecio = precio;
      if (maxPrecio === null || precio > maxPrecio) maxPrecio = precio;

      if (cobertura) {
        if (!preciosCobertura[cobertura]) {
          preciosCobertura[cobertura] = { sum: 0, count: 0 };
        }
        preciosCobertura[cobertura].sum += precio;
        preciosCobertura[cobertura].count += 1;
      }

      if (compania) {
        if (!preciosCompania[compania]) {
          preciosCompania[compania] = { sum: 0, count: 0 };
        }
        preciosCompania[compania].sum += precio;
        preciosCompania[compania].count += 1;
      }
    }

    if (cobertura) {
      porCobertura[cobertura] = (porCobertura[cobertura] || 0) + 1;
    }
    if (compania) {
      porCompania[compania] = (porCompania[compania] || 0) + 1;
    }
    if (ciudad) {
      porCiudad[ciudad] = (porCiudad[ciudad] || 0) + 1;
    }
  }

  const promedioPrecio = countPrecio > 0 ? sumaPrecio / countPrecio : null;

  const promedioPorCobertura = {};
  for (const key of Object.keys(preciosCobertura)) {
    const info = preciosCobertura[key];
    if (info.count > 0) {
      promedioPorCobertura[key] = info.sum / info.count;
    }
  }

  const promedioPorCompania = {};
  for (const key of Object.keys(preciosCompania)) {
    const info = preciosCompania[key];
    if (info.count > 0) {
      promedioPorCompania[key] = info.sum / info.count;
    }
  }

  return {
    totalRegistros,
    totalCompetidores: nombresSet.size,
    promedioPrecio,
    minPrecio,
    maxPrecio,
    porCobertura,
    porCompania,
    porCiudad,
    promedioPorCobertura,
    promedioPorCompania,
  };
}

// Cargar todo: ubicaciones + competidores
export const fetchCompetenciaData = createAsyncThunk(
  "competencia/fetchCompetenciaData",
  async (_, { rejectWithValue }) => {
    try {
      const [ubicRes, compRes] = await Promise.all([
        CompetenciaAPI.fetchUbicaciones(),
        CompetenciaAPI.fetchCompetidores(),
      ]);

      const ubicaciones = Array.isArray(ubicRes.data)
        ? ubicRes.data
        : ubicRes.data?.results || [];

      const competidores = Array.isArray(compRes.data)
        ? compRes.data
        : compRes.data?.results || [];

      return {
        ubicaciones,
        competidores,
      };
    } catch (err) {
      console.error("Error fetchCompetenciaData", err);
      return rejectWithValue(
        err.response?.data || { detail: "Error cargando datos" }
      );
    }
  }
);

// Crear registro (nombre + precio + compañía + cobertura + redes + ubicación)
export const createRegistro = createAsyncThunk(
  "competencia/createRegistro",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const {
        nombre,
        redes,
        precio,
        compania,
        cobertura,
        direccion,
        ciudad,
        url_maps,
      } = payload;

      const nombreTrim = (nombre || "").trim();
      if (!nombreTrim) {
        throw new Error("El nombre es obligatorio");
      }

      const sliceState = getState().competencia || {};
      const listaCompetidores = Array.isArray(sliceState.competidores)
        ? sliceState.competidores
        : [];

      let competidor = listaCompetidores.find(
        (c) => (c.nombre || "").toLowerCase() === nombreTrim.toLowerCase()
      );

      // Si no existe el competidor, lo creamos
      if (!competidor) {
        const resNuevo = await CompetenciaAPI.crearCompetidor({
          nombre: nombreTrim,
          redes: redes || "",
          activo: true,
        });
        competidor = resNuevo.data;
      } else if (redes && redes !== competidor.redes) {
        // Si cambia "redes", actualizamos el competidor
        await CompetenciaAPI.actualizarCompetidor(competidor.id, {
          ...competidor,
          redes,
        });
      }

      // Normalizamos precio: si no se puede parsear, mandamos null
      let safePrecio = null;
      if (precio !== "" && precio !== null && precio !== undefined) {
        const n = Number(precio);
        safePrecio = isNaN(n) ? null : n;
      }

      // El backend calcula lat/long desde url_maps
      const ubicacionPayload = {
        competidor: competidor.id,
        precio: safePrecio,
        compania: compania || "",
        cobertura: cobertura || "",
        direccion: direccion || "",
        ciudad: ciudad || "",
        url_maps: url_maps || "",
      };

      const resUbic = await CompetenciaAPI.crearUbicacion(ubicacionPayload);
      return { ubicacion: resUbic.data, competidor };
    } catch (err) {
      console.error("Error createRegistro", err);
      if (err.response?.data) {
        console.error("Detalle 400 backend:", err.response.data);
      }
      return rejectWithValue(
        err.response?.data || { detail: err.message || "Error al crear" }
      );
    }
  }
);

// Actualizar registro
export const updateRegistro = createAsyncThunk(
  "competencia/updateRegistro",
  async ({ id, original, data }, { rejectWithValue }) => {
    try {
      const {
        nombre,
        redes,
        precio,
        compania,
        cobertura,
        direccion,
        ciudad,
        url_maps,
      } = data;

      const nombreTrim = (nombre || "").trim();
      if (!nombreTrim) {
        throw new Error("El nombre es obligatorio");
      }

      let competidor = original?.competidor_obj || null;

      // Si vino el objeto original con más info, lo usamos
      if (!competidor && original?.competidor_detalle) {
        competidor = original.competidor_detalle;
      }

      // Si no, no tocamos el competidor (solo actualizamos ubicación)
      if (competidor && redes && redes !== competidor.redes) {
        await CompetenciaAPI.actualizarCompetidor(competidor.id, {
          ...competidor,
          redes,
        });
      }

      let safePrecio = null;
      if (precio !== "" && precio !== null && precio !== undefined) {
        const n = Number(precio);
        safePrecio = isNaN(n) ? null : n;
      }

      const ubicacionPayload = {
        competidor: original?.competidor,
        precio: safePrecio,
        compania: compania || "",
        cobertura: cobertura || "",
        direccion: direccion || "",
        ciudad: ciudad || "",
        url_maps: url_maps || "",
      };

      const resUbic = await CompetenciaAPI.actualizarUbicacion(
        id,
        ubicacionPayload
      );
      return resUbic.data;
    } catch (err) {
      console.error("Error updateRegistro", err);
      if (err.response?.data) {
        console.error("Detalle 400 backend:", err.response.data);
      }
      return rejectWithValue(
        err.response?.data || {
          detail: err.message || "Error al actualizar",
        }
      );
    }
  }
);

// Eliminar registro
export const deleteRegistro = createAsyncThunk(
  "competencia/deleteRegistro",
  async (id, { rejectWithValue }) => {
    try {
      await CompetenciaAPI.eliminarUbicacion(id);
      return id;
    } catch (err) {
      console.error("Error deleteRegistro", err);
      return rejectWithValue(
        err.response?.data || { detail: "Error al eliminar" }
      );
    }
  }
);

// ==== Mis precios propios (solo front, con localStorage) ====
export const crearMiPrecio = createAsyncThunk(
  "competencia/crearMiPrecio",
  async (payload, { getState }) => {
    const state = getState().competencia || {};
    const current = Array.isArray(state.misPrecios) ? state.misPrecios : [];

    const nextId =
      current.reduce(
        (max, item) =>
          typeof item?.id === "number" && item.id > max ? item.id : max,
        0
      ) + 1;

    const nuevo = {
      id: nextId,
      cobertura: (payload.cobertura || "").trim(),
      compania: (payload.compania || "").trim(),
      ciudad: (payload.ciudad || "").trim(),
      precio:
        payload.precio === "" || payload.precio == null
          ? null
          : Number(payload.precio),
      notas: (payload.notas || "").trim(),
      activo: payload.activo !== false,
    };

    const updated = [...current, nuevo];
    saveMisPrecios(updated);
    return updated;
  }
);

export const actualizarMiPrecio = createAsyncThunk(
  "competencia/actualizarMiPrecio",
  async ({ id, data }, { getState, rejectWithValue }) => {
    const state = getState().competencia || {};
    const current = Array.isArray(state.misPrecios) ? state.misPrecios : [];

    if (!current.some((item) => item.id === id)) {
      return rejectWithValue({ detail: "Precio propio no encontrado" });
    }

    const updated = current.map((item) =>
      item.id === id
        ? {
            ...item,
            ...data,
            precio:
              data.precio === "" || data.precio == null
                ? null
                : Number(data.precio),
          }
        : item
    );

    saveMisPrecios(updated);
    return updated;
  }
);

export const eliminarMiPrecio = createAsyncThunk(
  "competencia/eliminarMiPrecio",
  async (id, { getState }) => {
    const state = getState().competencia || {};
    const current = Array.isArray(state.misPrecios) ? state.misPrecios : [];
    const updated = current.filter((item) => item.id !== id);
    saveMisPrecios(updated);
    return updated;
  }
);

const competenciaSlice = createSlice({
  name: "competencia",
  initialState: {
    ubicaciones: [],
    competidores: [],
    misPrecios: loadMisPrecios(),
    loading: false,
    saving: false,
    error: null,
    stats: {
      totalRegistros: 0,
      totalCompetidores: 0,
      promedioPrecio: null,
      minPrecio: null,
      maxPrecio: null,
      porCobertura: {},
      porCompania: {},
      porCiudad: {},
      promedioPorCobertura: {},
      promedioPorCompania: {},
    },
  },
  reducers: {},
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchCompetenciaData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompetenciaData.fulfilled, (state, action) => {
        state.loading = false;
        const ubicaciones = Array.isArray(action.payload.ubicaciones)
          ? action.payload.ubicaciones
          : action.payload.ubicaciones?.results || [];

        const competidores = Array.isArray(action.payload.competidores)
          ? action.payload.competidores
          : action.payload.competidores?.results || [];

        state.ubicaciones = ubicaciones;
        state.competidores = competidores;
        state.stats = computeStats(state.ubicaciones);
      })
      .addCase(fetchCompetenciaData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error("No se pudieron cargar los datos de competencia");
      });

    // Crear
    builder
      .addCase(createRegistro.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createRegistro.fulfilled, (state, action) => {
        state.saving = false;
        const { ubicacion, competidor } = action.payload;

        if (!Array.isArray(state.ubicaciones)) state.ubicaciones = [];
        state.ubicaciones.push(ubicacion);

        if (!Array.isArray(state.competidores)) state.competidores = [];
        const exists = state.competidores.some(
          (c) => c.id === competidor.id
        );
        if (!exists) {
          state.competidores.push(competidor);
        }

        state.stats = computeStats(state.ubicaciones);
        toast.success("Registro creado");
      })
      .addCase(createRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;

        const msgBackend =
          typeof action.payload === "object" && action.payload !== null
            ? JSON.stringify(action.payload)
            : "";
        console.error("Error crear registro (backend):", msgBackend);

        const detail =
          (action.payload && action.payload.detail) ||
          "Error al crear registro de competencia";
        toast.error(detail);
      });

    // Actualizar
    builder
      .addCase(updateRegistro.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateRegistro.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;

        if (!Array.isArray(state.ubicaciones)) state.ubicaciones = [];
        const idx = state.ubicaciones.findIndex((u) => u.id === updated.id);
        if (idx !== -1) {
          state.ubicaciones[idx] = updated;
        }

        state.stats = computeStats(state.ubicaciones);
        toast.success("Registro actualizado");
      })
      .addCase(updateRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
        const msgBackend =
          typeof action.payload === "object" && action.payload !== null
            ? JSON.stringify(action.payload)
            : "";
        console.error("Error actualizar registro (backend):", msgBackend);
        toast.error(
          action.payload?.detail || "Error al actualizar registro de competencia"
        );
      });

    // Eliminar
    builder
      .addCase(deleteRegistro.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteRegistro.fulfilled, (state, action) => {
        state.saving = false;
        const id = action.payload;

        if (!Array.isArray(state.ubicaciones)) state.ubicaciones = [];
        state.ubicaciones = state.ubicaciones.filter((u) => u.id !== id);

        state.stats = computeStats(state.ubicaciones);
        toast.success("Registro eliminado");
      })
      .addCase(deleteRegistro.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
        toast.error(
          action.payload?.detail || "Error al eliminar registro de competencia"
        );
      });

    // Mis precios (solo front)
    builder
      .addCase(crearMiPrecio.fulfilled, (state, action) => {
        state.misPrecios = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(actualizarMiPrecio.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.misPrecios = action.payload;
        }
      })
      .addCase(eliminarMiPrecio.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.misPrecios = action.payload;
        }
      });
  },
});

export default competenciaSlice.reducer;
