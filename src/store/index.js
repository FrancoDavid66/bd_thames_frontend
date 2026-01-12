// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import clientesReducer from "./slices/clientesSlice";
import themeReducer from "./slices/themeSlice";
import polizasReducer from "./slices/polizasSlice";
import pagosReducer from "./slices/pagosSlice";
import siniestrosReducer from "./slices/siniestrosSlice";
import geoReducer from "./slices/geoSlice";
import propiedadesReducer from "./slices/propiedadesSlice";
import alquileresReducer from "./slices/alquileresSlice";
import ingresosReducer from "./slices/ingresosSlice";
import egresosReducer from "./slices/egresosSlice";
import balanceReducer from "./slices/balanceSlice";
import gruasReducer from "./slices/gruasSlice";

// 👇 NUEVO: registrar el slice de Asegurados
// Asegúrate de tener el archivo en: src/store/slices/aseguradosSlice.js
import aseguradosReducer from "./slices/aseguradosSlice";
import cuponesRoboReducer from "./slices/cuponesRoboSlice";

// 👇 NUEVO: slice de Competencia
// Archivo: src/store/slices/competenciaSlice.js
import competenciaReducer from "./slices/competenciaSlice";
import renovacionesReducer from "./slices/renovacionesSlice";

// ✅🆕 NUEVO: slice de Vencimientos
// Archivo: src/store/slices/vencimientosSlice.js
import vencimientosReducer from "./slices/vencimientosSlice";

export const store = configureStore({
  reducer: {
    clientes: clientesReducer,
    theme: themeReducer,
    polizas: polizasReducer,
    pagos: pagosReducer,
    siniestros: siniestrosReducer,
    geo: geoReducer,
    propiedades: propiedadesReducer,
    alquileres: alquileresReducer,
    ingresos: ingresosReducer,
    egresos: egresosReducer,
    balance: balanceReducer,
    gruas: gruasReducer,
    // 👇 clave que usas en useSelector((s) => s.asegurados)
    asegurados: aseguradosReducer,
    cuponesRobo: cuponesRoboReducer,
    // 👇 ahora podés usar useSelector((s) => s.competencia)
    competencia: competenciaReducer,
    renovaciones: renovacionesReducer,

    // ✅🆕 ahora podés usar useSelector((s) => s.vencimientos)
    vencimientos: vencimientosReducer,
  },
});

export default store;
