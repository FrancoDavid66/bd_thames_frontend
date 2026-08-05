// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import clientesReducer from "./slices/clientesSlice";
import themeReducer from "./slices/themeSlice";
import polizasReducer from "./slices/polizasSlice";
import pagosReducer from "./slices/pagosSlice";
import siniestrosReducer from "./slices/siniestrosSlice";
import propiedadesReducer from "./slices/propiedadesSlice";
import ingresosReducer from "./slices/ingresosSlice";
import egresosReducer from "./slices/egresosSlice";
import balanceReducer from "./slices/balanceSlice";

// Asegurados
import aseguradosReducer from "./slices/aseguradosSlice";
import cuponesRoboReducer from "./slices/cuponesRoboSlice";

// Renovaciones
import renovacionesReducer from "./slices/renovacionesSlice";

// ✅🆕 Bajas
import bajasReducer from "./slices/bajasSlice";

// ✅🆕 Recaudación / Cierres de caja
import recaudacionReducer from "./slices/recaudacionSlice";

// 🚀 NUEVO: Cotizaciones
import cotizacionesReducer from "./slices/cotizacionesSlice";

// 🚀 NUEVO: Panel de Administración
import adminReducer from "./slices/adminSlice";

// Solicitudes
import solicitudesReducer from "./slices/solicitudesSlice";

// 🚀 NUEVO: Servicios y Gastos Fijos
import serviciosReducer from "./slices/serviciosSlice";

// 🆕 NUEVO: Tareas del día
import tareasReducer from "./slices/tareasSlice";

export const store = configureStore({
  reducer: {
    clientes: clientesReducer,
    theme: themeReducer,
    polizas: polizasReducer,
    pagos: pagosReducer,
    siniestros: siniestrosReducer,
    propiedades: propiedadesReducer,
    ingresos: ingresosReducer,
    egresos: egresosReducer,
    balance: balanceReducer,

    asegurados: aseguradosReducer,
    cuponesRobo: cuponesRoboReducer,

    renovaciones: renovacionesReducer,

    // ✅🆕
    bajas: bajasReducer,

    // ✅🆕
    recaudacion: recaudacionReducer,

    // 🚀 NUEVO
    cotizaciones: cotizacionesReducer,

    // 🚀 NUEVO: Panel Admin (Usuarios y Oficinas)
    admin: adminReducer,

    // Solicitudes
    solicitudes: solicitudesReducer,

    // 🚀 NUEVO: Servicios y Gastos Fijos
    servicios: serviciosReducer,

    // 🆕 NUEVO: Tareas del día
    tareas: tareasReducer,
  },
});

export default store;
