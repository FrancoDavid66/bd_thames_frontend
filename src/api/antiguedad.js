// utils/antiguedad.js
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

const firstValidDate = (...vals) => {
  for (const v of vals) {
    const d = v ? dayjs(v) : null;
    if (d && d.isValid()) return d.startOf("day");
  }
  return null;
};

export function getAntiguedad({ cliente = {}, poliza = {} } = {}) {
  const desde = firstValidDate(
    cliente.fecha_alta, cliente.created_at, cliente.creado_en,
    poliza.primer_pago, poliza.fecha_emision, poliza.fecha_inicio, poliza.inicio_vigencia
  );
  if (!desde) return { label: "—", desde: null };

  const ms = dayjs().diff(desde);
  const dur = dayjs.duration(ms);
  const y = dur.years();
  const m = dur.months();

  const label =
    y > 0
      ? `${y} año${y > 1 ? "s" : ""}${m > 0 ? ` · ${m} mes${m > 1 ? "es" : ""}` : ""}`
      : `${m} mes${m === 1 ? "" : "es"}`;

  return { label, desde };
}
