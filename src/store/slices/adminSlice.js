// src/store/slices/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const getApiUrl = () => (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

// --- RUTAS DE USUARIOS / OFICINAS ---
export const fetchAdminOficinas = createAsyncThunk('admin/fetchOficinas', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/usuarios/oficinas/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Error al cargar oficinas');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch (error) { return rejectWithValue(error.message); }
});

export const fetchAdminUsuarios = createAsyncThunk('admin/fetchUsuarios', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/usuarios/users/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Error al cargar usuarios');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch (error) { return rejectWithValue(error.message); }
});

export const fetchAdminResponsables = createAsyncThunk('admin/fetchResponsables', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/empleados/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Error al cargar responsables');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch (error) { return rejectWithValue(error.message); }
});

// 🚀 RUTAS DE CATÁLOGOS
export const fetchAdminCompanias = createAsyncThunk('admin/fetchCompanias', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/cotizaciones/companias/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Error al cargar compañías');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch (error) { return rejectWithValue(error.message); }
});

export const fetchAdminCoberturas = createAsyncThunk('admin/fetchCoberturas', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/cotizaciones/coberturas/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Error al cargar coberturas');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  } catch (error) { return rejectWithValue(error.message); }
});

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    oficinas: [], 
    usuarios: [], 
    responsables: [],
    companias: [], 
    coberturas: [],
    loadingOficinas: false, 
    loadingUsuarios: false, 
    loadingResponsables: false,
    loadingCompanias: false, 
    loadingCoberturas: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOficinas.pending, (state) => { state.loadingOficinas = true; })
      .addCase(fetchAdminOficinas.fulfilled, (state, action) => { state.loadingOficinas = false; state.oficinas = action.payload; })
      .addCase(fetchAdminOficinas.rejected, (state) => { state.loadingOficinas = false; })
      
      .addCase(fetchAdminUsuarios.pending, (state) => { state.loadingUsuarios = true; })
      .addCase(fetchAdminUsuarios.fulfilled, (state, action) => { state.loadingUsuarios = false; state.usuarios = action.payload; })
      .addCase(fetchAdminUsuarios.rejected, (state) => { state.loadingUsuarios = false; })

      .addCase(fetchAdminResponsables.pending, (state) => { state.loadingResponsables = true; })
      .addCase(fetchAdminResponsables.fulfilled, (state, action) => { state.loadingResponsables = false; state.responsables = action.payload; })
      .addCase(fetchAdminResponsables.rejected, (state) => { state.loadingResponsables = false; })

      .addCase(fetchAdminCompanias.pending, (state) => { state.loadingCompanias = true; })
      .addCase(fetchAdminCompanias.fulfilled, (state, action) => { state.loadingCompanias = false; state.companias = action.payload; })
      .addCase(fetchAdminCompanias.rejected, (state) => { state.loadingCompanias = false; })

      .addCase(fetchAdminCoberturas.pending, (state) => { state.loadingCoberturas = true; })
      .addCase(fetchAdminCoberturas.fulfilled, (state, action) => { state.loadingCoberturas = false; state.coberturas = action.payload; })
      .addCase(fetchAdminCoberturas.rejected, (state) => { state.loadingCoberturas = false; });
  }
});

export default adminSlice.reducer;