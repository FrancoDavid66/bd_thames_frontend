// src/components/solicitudes/modalcreate/RevisionRapidaStep.jsx
//
// 🆕 FASE 1 — Mini-wizard "solo lo que falta".
// Muestra UNA pantalla por vez, con únicamente los campos vacíos de cada sección.
// Si una sección no tiene nada que completar, se saltea sola.
// Secuencia: [Asegurado faltante] → [Vehículo faltante] → [Responsable] → onTerminar()

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiUser, HiTruck, HiIdentification, HiCheckCircle,
  HiChevronLeft, HiChevronRight, HiSparkles, HiOfficeBuilding, HiExclamationCircle,
} from "react-icons/hi";

const CARROCERIAS = ["Automóvil", "Sedán", "Hatchback", "SUV", "Pick-up", "Familiar / Rural", "Coupé", "Furgón", "Utilitario", "Moto", "Otro"];
const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

function Campo({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-white/50 ml-1">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-2xl bg-black/40 border border-white/15 px-4 py-3.5 text-white placeholder:text-white/25 outline-none focus:ring-2 ring-sky-500/50 focus:border-sky-500/40 transition-all text-base"
      />
    </label>
  );
}

function CampoSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-white/50 ml-1">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-black/40 border border-white/15 px-4 py-3.5 text-white outline-none focus:ring-2 ring-sky-500/50 transition-all text-base appearance-none cursor-pointer"
      >
        <option value="" className="bg-[#0b0f1e]">— Elegir —</option>
        {options.map((o) => <option key={o} value={o} className="bg-[#0b0f1e]">{o}</option>)}
      </select>
    </label>
  );
}

export default function RevisionRapidaStep({
  cliente = {}, setCliente,
  clienteModo = "nuevo",   // 🆕 si viene "existente" (cliente precargado), salteamos "asegurado"
  poliza = {}, setPoliza,
  coberturas = [],
  companias = [],
  empleados = [], empleadosLoading = false,
  responsableId, onElegirResponsable,
  onTerminar,
}) {
  const setC = (k, v) => setCliente((p) => ({ ...p, [k]: v }));
  const setP = (k, v) => setPoliza((p) => ({ ...p, [k]: v }));

  // Qué campos faltaban AL ABRIR (fijo, no cambia mientras completás)
  const [faltan] = useState(() => ({
    compania: !poliza.compania, // 🆕 si el PDF no la detectó, se elige a mano
    telefono: !cliente.telefono, // 🆕 solo si el PDF no trajo el teléfono
    cobertura: !poliza.cobertura, // 🆕 solo se pide si el PDF no la trajo ya matcheada al catálogo
    // 🆕 Datos del vehículo (el lector no siempre los trae → hay que poder cargarlos a mano)
    marca: !poliza.marca,
    modelo: !poliza.modelo,
    anio: !poliza.anio,
    carroceria: !poliza.carroceria,
    numero_chasis: !poliza.numero_chasis,
    numero_motor: !poliza.numero_motor,
  }));

  // 🆕 El TIPO solo define el precio en NRE. En compañías con cuponera (AMCA, etc.)
  //    el precio viene del cupón → NO hace falta pedir el tipo.
  // 🆕 NRE robusto: la compañía puede llegar como NOMBRE o como ID (según de dónde
  //    se abra el alta). La resolvemos contra el catálogo y limpiamos puntos/espacios
  //    ("N.R.E." → "NRE") para detectarla SIEMPRE.
  const esNRE = (() => {
    const raw = String(poliza.compania || "").trim();
    if (!raw) return false;
    const found = (companias || []).find(
      (c) => String(c?.id) === raw || String(c?.nombre || "").trim().toLowerCase() === raw.toLowerCase()
    );
    const nombre = found?.nombre || raw;
    return String(nombre).toUpperCase().replace(/[^A-Z]/g, "").includes("NRE");
  })();

  // Armar la secuencia de pantallas según lo que falte (+ responsable siempre)
  const [pantallas] = useState(() => {
    const arr = [];
    if (faltan.compania) arr.push("compania");
    // 🆕 Si el cliente ya está en el sistema (existente), NO le pedimos los datos de nuevo.
    if (faltan.telefono && clienteModo !== "existente") arr.push("asegurado");
    // 🆕 Vehículo: solo si es NRE (tipo) o falta algo REQUERIDO (cobertura/marca/modelo/año).
    //    Carrocería, chasis y motor son opcionales → no fuerzan la pantalla.
    const necesitaVehiculo =
      esNRE || faltan.cobertura || faltan.marca || faltan.modelo || faltan.anio;
    if (necesitaVehiculo) arr.push("vehiculo");
    arr.push("responsable");
    return arr;
  });

  useEffect(() => {
    console.log("%c[REVISION] qué muestra el wizard ▶", "color:#f59e0b;font-weight:bold", {
      pantallas, faltan,
      cliente_recibido: cliente, poliza_recibida: poliza,
      responsables: (empleados || []).length,
    });
  }, []); // eslint-disable-line

  // 🆕 NRE: autocompletar cobertura y carrocería para que el operador NO las
  //    elija a mano. La cobertura es SIEMPRE "A": la matcheamos contra la opción
  //    REAL del catálogo (aunque se llame "A - Resp. Civil"). La carrocería la
  //    derivamos del tipo. Ambas quedan editables por si hace falta cambiarlas.
  useEffect(() => {
    if (!esNRE) return;
    const norm = (s) => String(s || "").trim().toLowerCase();

    // Cobertura NRE: SIEMPRE queda seteada (NRE opera solo "A").
    //  1) la "A" del catálogo de NRE, o cualquier cobertura de NRE (sea cual sea
    //     su nombre), o cualquier "A"; 2) si el catálogo no tiene nada, "A" literal.
    const cobs = Array.isArray(coberturas) ? coberturas : [];
    const nombres = cobs.map((c) => c.nombre);
    const yaValida = poliza.cobertura && nombres.includes(poliza.cobertura);
    if (!yaValida) {
      const esA = (n) => {
        n = norm(n);
        return n === "a" || n.startsWith("a ") || n.startsWith("a-") || n.startsWith("a (");
      };
      const aCat =
        cobs.find((c) => norm(c.compania_nombre).includes("nre") && esA(c.nombre)) ||
        cobs.find((c) => norm(c.compania_nombre).includes("nre")) ||
        cobs.find((c) => esA(c.nombre));
      const destino = aCat ? aCat.nombre : "A";
      if (poliza.cobertura !== destino) setP("cobertura", destino);
    }

    // Carrocería (opcional): la derivamos del tipo si está vacía.
    if (!poliza.carroceria) {
      const mapa = { auto: "Automóvil", camioneta: "Pick-up", moto: "Moto" };
      const car = mapa[norm(poliza.tipo)];
      if (car) setP("carroceria", car);
    }
  }, [esNRE, coberturas, poliza.tipo]); // eslint-disable-line

  // 🆕 El Tipo define el precio en NRE, así que exigimos que el operador lo
  //    elija de forma ACTIVA (no alcanza con que ya tenga un valor por default).
  const [tipoConfirmado, setTipoConfirmado] = useState(false);

  const [idx, setIdx] = useState(0);
  const actual = pantallas[idx];
  const esUltima = idx === pantallas.length - 1;
  const total = pantallas.length;

  const TITULOS = {
    compania:    { icon: HiOfficeBuilding, color: "bg-rose-500/15 text-rose-300 border-rose-500/20", t: "Compañía", s: "No la detectamos — elegila" },
    asegurado:   { icon: HiUser, color: "bg-sky-500/15 text-sky-300 border-sky-500/20", t: "Datos del asegurado", s: "Completá lo que falta" },
    vehiculo:    { icon: HiTruck, color: "bg-violet-500/15 text-violet-300 border-violet-500/20", t: "Vehículo y cobertura", s: "Completá lo que falta" },
    responsable: { icon: HiIdentification, color: "bg-amber-500/15 text-amber-300 border-amber-500/20", t: "Responsable", s: "Elegí quién carga la solicitud" },
  };
  const meta = TITULOS[actual];

  const puedeSeguir =
    actual === "responsable" ? !!responsableId
    : actual === "compania" ? !!poliza.compania
    : actual === "asegurado" ? !!cliente.telefono
    : actual === "vehiculo" ? (
        (!esNRE || tipoConfirmado) &&
        !!poliza.cobertura &&
        (!faltan.marca  || !!poliza.marca) &&
        (!faltan.modelo || !!poliza.modelo) &&
        (!faltan.anio   || !!String(poliza.anio || "").trim())
      )
    : true;

  const siguiente = () => {
    if (actual === "responsable" && !responsableId) return;
    if (esUltima) onTerminar?.();
    else setIdx((i) => i + 1);
  };
  const atras = () => { if (idx > 0) setIdx((i) => i - 1); };

  return (
    <div className="max-w-md mx-auto">
      {/* Progreso */}
      <div className="flex items-center gap-2 mb-5">
        {pantallas.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? "bg-sky-500" : "bg-white/10"}`} />
        ))}
      </div>

      {/* 🆕 Datos ya detectados del PDF (para que el usuario quede tranquilo) */}
      {(() => {
        const filas = [
          ["Compañía", poliza.compania],
          ["Cobertura", poliza.cobertura],
          ["Asegurado", [cliente.apellido, cliente.nombre].filter(Boolean).join(", ") || cliente.nombre],
          ["DNI/CUIT", cliente.dni_cuit_cuil || cliente.dni],
          ["Vehículo", [poliza.marca, poliza.modelo].filter(Boolean).join(" ")],
          ["Año", poliza.anio],
          ["Patente", poliza.patente],
        ].filter(([, v]) => v);
        if (!filas.length) return null;
        return (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/80 mb-2 flex items-center gap-1.5">
              <HiCheckCircle className="text-emerald-400" /> Datos detectados del PDF
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {filas.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wide text-white/35">{k}</span>
                  <span className="block text-sm text-white/90 truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <AnimatePresence mode="wait">
        <motion.div
          key={actual + idx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {/* Encabezado de la pantalla */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2.5 rounded-2xl border ${meta.color}`}><meta.icon className="text-xl" /></div>
            <div>
              <h3 className="text-white font-black text-lg leading-tight">{meta.t}</h3>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
                Paso {idx + 1} de {total} · {meta.s}
              </p>
            </div>
          </div>

          {/* COMPAÑÍA (solo si no se detectó) */}
          {actual === "compania" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200 text-sm flex items-start gap-2">
                <HiExclamationCircle className="shrink-0 mt-0.5 text-base" />
                <span>No pudimos detectar la compañía de este PDF. Elegila de la lista.</span>
              </div>
              <CampoSelect label="Compañía *" value={poliza.compania} onChange={(v) => setP("compania", v)} options={companias.map((c) => c.nombre)} />
            </div>
          )}

          {/* ASEGURADO */}
          {actual === "asegurado" && (
            <div className="space-y-4">
              {faltan.telefono && <Campo label="Teléfono (WhatsApp) *" value={cliente.telefono} onChange={(v) => setC("telefono", v)} type="tel" placeholder="Ej: 1133334444" />}
            </div>
          )}

          {/* VEHÍCULO */}
          {actual === "vehiculo" && (
            <div className="space-y-4">
              {esNRE && (
                <>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200 text-xs flex items-start gap-2">
                    <HiExclamationCircle className="shrink-0 mt-0.5 text-base" />
                    <span>El <b>tipo</b> define el precio. Ojo: furgones y pick-ups que el Mercosur llama "Automóvil" se cobran como <b>Camioneta</b>.</span>
                  </div>
                  <CampoSelect
                    label="Tipo (define el precio) *"
                    value={tipoConfirmado ? poliza.tipo : ""}
                    onChange={(v) => { setP("tipo", v); setTipoConfirmado(true); }}
                    options={TIPOS_VEHICULO}
                  />
                </>
              )}
              {faltan.cobertura && (esNRE ? (
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/50 ml-1">Cobertura *</span>
                  <div className="w-full rounded-2xl bg-black/40 border border-emerald-500/25 px-4 py-3.5 text-white text-base flex items-center gap-2">
                    <HiCheckCircle className="text-emerald-400 shrink-0" />
                    <span>{poliza.cobertura || "A"} <span className="text-white/40 text-sm">· NRE (fija)</span></span>
                  </div>
                </label>
              ) : (
                <CampoSelect label="Cobertura *" value={poliza.cobertura} onChange={(v) => setP("cobertura", v)} options={coberturas.map((c) => c.nombre)} />
              ))}
              {faltan.marca && <Campo label="Marca *" value={poliza.marca} onChange={(v) => setP("marca", v)} placeholder="Ej: Toyota" />}
              {faltan.modelo && <Campo label="Modelo *" value={poliza.modelo} onChange={(v) => setP("modelo", v)} placeholder="Ej: Hilux" />}
              {faltan.anio && <Campo label="Año *" value={poliza.anio} onChange={(v) => setP("anio", v)} type="number" placeholder="Ej: 2020" />}
              {faltan.carroceria && <CampoSelect label="Carrocería" value={poliza.carroceria} onChange={(v) => setP("carroceria", v)} options={CARROCERIAS} />}
              {faltan.numero_chasis && <Campo label="N° Chasis" value={poliza.numero_chasis} onChange={(v) => setP("numero_chasis", v)} placeholder="Opcional" />}
              {faltan.numero_motor && <Campo label="N° Motor" value={poliza.numero_motor} onChange={(v) => setP("numero_motor", v)} placeholder="Opcional" />}
            </div>
          )}

          {/* RESPONSABLE */}
          {actual === "responsable" && (
            empleadosLoading ? (
              <p className="text-white/40 text-sm italic animate-pulse">Cargando responsables...</p>
            ) : empleados.length === 0 ? (
              <p className="text-white/40 text-sm italic">No hay responsables activos en esta sucursal.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {empleados.map((e) => {
                  const sel = String(responsableId) === String(e.id);
                  return (
                    <button key={e.id} type="button" onClick={() => onElegirResponsable(e.id)}
                      className={`flex items-center gap-2 text-left px-4 py-3.5 rounded-2xl border font-bold text-sm transition-all active:scale-95 ${sel ? "bg-amber-500/25 border-amber-500/50 text-white" : "bg-white/5 border-white/10 text-white/80 hover:border-amber-500/40"}`}>
                      {sel ? <HiCheckCircle className="text-amber-300 shrink-0" /> : <HiUser className="text-white/40 shrink-0" />}
                      <span className="truncate">{e.nombre}</span>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navegación interna */}
      <div className="flex items-center gap-3 mt-7">
        {idx > 0 && (
          <button type="button" onClick={atras}
            className="px-5 py-3 rounded-2xl bg-white/10 text-white font-bold uppercase text-xs flex items-center gap-1.5 active:scale-95 transition-all">
            <HiChevronLeft /> Atrás
          </button>
        )}
        <button type="button" onClick={siguiente} disabled={!puedeSeguir}
          className="flex-1 px-6 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40">
          {esUltima ? (<><HiSparkles /> Crear solicitud</>) : (<>Siguiente <HiChevronRight /></>)}
        </button>
      </div>
    </div>
  );
}