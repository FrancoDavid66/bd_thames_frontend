// src/services/sesionGlobal.js
// Se importa PRIMERO en main.jsx: deja instalada la sesión que se renueva sola
// en todos los clientes HTTP de la app (ver services/sesion.js).
import { instalarSesionGlobal } from "./sesion";

instalarSesionGlobal();
