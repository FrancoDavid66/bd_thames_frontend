// src/components/solicitudes/modalcreate/PolizaStep.jsx
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Props:
 * - poliza, setPoliza
 * - sinNumero, setSinNumero
 * - companias: Array<string|{id,nombre}>
 * - coberturas: Array<string|{id,nombre}> (pueden venir como enums tipo A_GRUA)
 * - variants (opcional)
 */

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"].map((x) => ({ id: x, nombre: x }));
const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

// Coberturas por defecto (orden oficial)
const DEFAULT_COBERTURAS = ["A", "A + GRUA", "B", "B1", "C", "C1", "C TOTAL", "C FRANQUICIA"];

/* ===== cobertura: enum ↔ humano ===== */
const ENUM_TO_HUMAN = {
  A: "A",
  A_GRUA: "A + GRUA",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  C_TOTAL: "C TOTAL",
  C_FRANQUICIA: "C FRANQUICIA",
};
function toHumanCoverage(v) {
  if (!v) return "";
  const k = String(v).trim().toUpperCase();
  if (ENUM_TO_HUMAN[k]) return ENUM_TO_HUMAN[k];
  return k.replace(/_/g, " ").replace(/\s\+\s?GRUA/, " + GRUA");
}
// Normalización simple para reglas internas (A / A_GRUA / OTRAS)
function toRuleKey(human) {
  const k = String(human || "").trim().toUpperCase();
  if (k === "A") return "A";
  if (k === "A + GRUA") return "A_GRUA";
  return "OTRAS";
}

/* ===== Fechas (LOCAL) ===== */
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYMDLocal(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function lastDayOfMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}
function addMonthsLocal(ymd, months) {
  const base = parseYMDLocal(ymd);
  if (!base) return "";
  const y = base.getFullYear();
  const m0 = base.getMonth();
  const d = base.getDate();
  const tMon = m0 + months;
  const y2 = y + Math.floor(tMon / 12);
  const m2 = ((tMon % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(y2, m2);
  const day2 = Math.min(d, maxDay);
  return ymdLocal(new Date(y2, m2, day2, 12, 0, 0, 0));
}

/* ===================== Componente ===================== */
export default function PolizaStep({
  poliza = {},
  setPoliza = () => {},
  sinNumero,
  setSinNumero,
  companias = [],
  coberturas = DEFAULT_COBERTURAS,
  variants,
}) {
  // Set inicial de fecha_emision si falta
  useEffect(() => {
    if (!poliza?.fecha_emision) {
      setPoliza((prev = {}) => ({ ...prev, fecha_emision: ymdLocal(new Date()) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primer vencimiento = fecha_emision + 1 mes (auto)
  useEffect(() => {
    if (!poliza?.fecha_emision) return;
    const next = addMonthsLocal(poliza.fecha_emision, 1);
    setPoliza((prev = {}) => ({ ...prev, primer_vencimiento: next }));
  }, [poliza?.fecha_emision, setPoliza]);

  // Coberturas normalizadas a humano y asegurando listado completo
  const coberturasOpts = useMemo(() => {
    const provided = Array.isArray(coberturas) ? coberturas : [];
    const provHuman = provided.map((op) => {
      const id = typeof op === "string" ? op : op?.id ?? op?.nombre ?? "";
      const human = toHumanCoverage(id);
      return { id: human, nombre: human };
    });
    const merged = [...provHuman, ...DEFAULT_COBERTURAS.map((h) => ({ id: h, nombre: h }))];
    const order = new Map(DEFAULT_COBERTURAS.map((h, i) => [h, i]));
    const seen = new Set();
    const dedup = merged.filter((o) => {
      const key = String(o.id).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    dedup.sort((a, b) => {
      const ia = order.has(a.id) ? order.get(a.id) : 999;
      const ib = order.has(b.id) ? order.get(b.id) : 999;
      return ia - ib;
    });
    return dedup;
  }, [coberturas]);

  // Si cobertura viene enum (A_GRUA), mostrar como humano
  useEffect(() => {
    if (!poliza?.cobertura) return;
    const human = toHumanCoverage(poliza.cobertura);
    if (human && human !== poliza.cobertura) {
      setPoliza((prev = {}) => ({ ...prev, cobertura: human }));
    }
  }, [poliza?.cobertura, setPoliza]);

  // Reglas de requisitos (se muestran solo como guía en este paso)
  const coverageRuleKey = toRuleKey(poliza?.cobertura);
  const requisitos = useMemo(() => {
    if (coverageRuleKey === "A") {
      return {
        title: "Requisitos para cobertura A",
        items: ["Cédula verde (frente)"],
        note: "No se solicitan fotos del vehículo en esta cobertura.",
        color: "from-emerald-200/80 to-teal-200/80",
      };
    }
    if (coverageRuleKey === "A_GRUA") {
      return {
        title: "Requisitos para A + GRÚA",
        items: [
          "Cédula verde (frente)",
          "VTV",
          "Fotos del vehículo: Frente, Lateral Izq., Lateral Der., Trasera",
        ],
        note: "Estas imágenes se cargarán en el paso siguiente.",
        color: "from-sky-200/80 to-cyan-200/80",
      };
    }
    return {
      title: "Requisitos para otras coberturas",
      items: [
        "Cédula verde (frente)",
        "VTV (si aplica)",
        "Oblea GNC / Título (si aplica)",
        "Fotos completas del vehículo (incluye interiores/auxilio si corresponde)",
      ],
      note: "En el próximo paso podrás adjuntar documentos y galería de fotos.",
      color: "from-amber-200/80 to-yellow-200/80",
    };
  }, [coverageRuleKey]);

  return (
    <motion.div
      key="poliza-step"
      variants={
        variants || {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
          exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
        }
      }
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-3"
    >
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
        <legend className="px-1 text-white/85 text-sm">Póliza</legend>

        <div className="grid md:grid-cols-2 gap-3">
          <Select
            label="Compañía"
            value={poliza?.compania || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, compania: v }))}
            options={companias}
          />

          <div className="grid gap-1">
            <Input
              label={
                <span className="flex items-center justify-between">
                  <span>Número de póliza</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !sinNumero;
                      setSinNumero(next);
                      if (next && !(poliza?.numero_poliza || "").trim()) {
                        const temp = genSNNumber(poliza?.patente);
                        setPoliza((prev = {}) => ({ ...prev, numero_poliza: temp }));
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded-lg border transition ${
                      sinNumero
                        ? "bg-emerald-300/90 text-[#0b0f1e] border-emerald-200 hover:brightness-105"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                    title={sinNumero ? "Usar número definitivo" : "Marcar como sin número (temporal)"}
                  >
                    {sinNumero ? "Con número" : "Sin número"}
                  </button>
                </span>
              }
              value={poliza?.numero_poliza || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, numero_poliza: v }))}
            />
            {sinNumero && <span className="text-[11px] text-emerald-200">Se usará un número <b>temporal</b>.</span>}
          </div>

          <Select
            label="Cobertura"
            value={poliza?.cobertura || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, cobertura: v }))}
            options={coberturasOpts}
          />

          <Select
            label="Oficina"
            value={poliza?.oficina || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, oficina: v }))}
            options={OFICINAS}
          />
        </div>

        {/* Reglas dinámicas por cobertura (guía) */}
        <div className="mt-3 rounded-xl border border-white/10 p-3 bg-white/[.05]">
          <div
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-[#0b0f1e] bg-gradient-to-br ${requisitos.color} mb-2`}
          >
            {requisitos.title}
          </div>
          <ul className="list-disc pl-5 text-white/90 text-sm space-y-1">
            {requisitos.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
          {requisitos.note ? <p className="mt-2 text-white/70 text-xs">{requisitos.note}</p> : null}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Input
            label="Patente"
            value={poliza?.patente || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, patente: v.toUpperCase() }))}
            autoCapitalize="characters"
          />
          <Select
            label="Tipo de vehículo"
            value={poliza?.tipo || "Auto"}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, tipo: v }))}
            options={TIPOS_VEHICULO}
          />
          <Input label="Marca" value={poliza?.marca || ""} onChange={(v) => setPoliza((prev = {}) => ({ ...prev, marca: v }))} />
          <Input label="Modelo" value={poliza?.modelo || ""} onChange={(v) => setPoliza((prev = {}) => ({ ...prev, modelo: v }))} />
          <Input
            label="Año"
            value={poliza?.anio || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, anio: v.replace(/\D/g, "") }))}
            inputMode="numeric"
          />
          <Input
            label="Fecha de emisión"
            type="date"
            value={poliza?.fecha_emision || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, fecha_emision: v }))}
          />
          <Input
            label="Primer vencimiento"
            type="date"
            value={poliza?.primer_vencimiento || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, primer_vencimiento: v }))}
          />
          <Input
            label="Días a vencer (meta interna)"
            value={poliza?.dias_a_vencer ?? 30}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, dias_a_vencer: v.replace(/\D/g, "") }))}
            inputMode="numeric"
          />
        </div>
      </fieldset>
    </motion.div>
  );
}

/* ===================== UI bits ===================== */
function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-3 text-white/90">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-12 h-7 rounded-full transition ${checked ? "bg-emerald-300" : "bg-white/20"}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  helper = "",
  className = "",
  inputMode,
  autoComplete,
  autoCapitalize,
  pattern,
}) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        pattern={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-4 ring-sky-200/30 text-white placeholder:text-white/40 transition"
      />
      {helper ? <span className="mt-1 block text-xs text-white/65">{helper}</span> : null}
    </label>
  );
}

function Select({ label, value, onChange, options = [], className = "" }) {
  const normalized = Array.isArray(options)
    ? options.map((op) => (typeof op === "string" ? { id: op, nombre: op } : op))
    : [];
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 px-3 py-3 pr-9 outline-none focus:ring-4 ring-violet-200/30 text-white appearance-none transition"
          style={{ backgroundColor: "#141827" }}
          data-theme="dark"
        >
          <option value="">— Seleccionar —</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">▾</span>
      </div>
    </label>
  );
}

/* ===== Helpers ===== */
function genSNNumber(patente = "") {
  const base = String(patente || "SN").replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase();
  const ts = new Date();
  const stamp =
    ts.getFullYear().toString() +
    String(ts.getMonth() + 1).padStart(2, "0") +
    String(ts.getDate()).padStart(2, "0") +
    String(ts.getHours()).padStart(2, "0") +
    String(ts.getMinutes()).padStart(2, "0");
  return `SN-${base || "TEMP"}-${stamp}`;
}
