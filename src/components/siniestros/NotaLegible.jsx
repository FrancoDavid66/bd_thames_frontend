// src/components/siniestros/NotaLegible.jsx
//
// 📝 NOTAS DEL SINIESTRO, FÁCILES DE LEER (Franco 18/11/2026: «el abogado tiene que leer fácil y rápido»).
//
// Las notas llegan como un solo texto largo. Ej (lo que escribe el conector de Claude):
//   "[david-admin desde Claude] Estado → DENUNCIADO. RECLAMO · 13/11/2026 · DENUNCIA · NRE · N° 25166 (…).
//    Choque 14/10/2026 … Presupuesto Diego & Titi 17/10/2026: $ 3.380.200. OJO: título a nombre de …"
// Acá se muestran así:
//   [📄 Denuncia] 13/11/2026 · Estado → Denunciado
//   • NRE · N° 25166 (…)
//   • Choque 14/10/2026 …
//   • Presupuesto Diego & Titi 17/10/2026: $ 3.380.200
//   ⚠️ Ojo: título a nombre de …              (en amarillo)
// Y "Portal del cliente: Documentación pendiente: — → ['08 firmado', 'Exposición civil']" queda como lista.
// No cambia lo guardado: solo cómo se ve.

const EVENTOS = {
  PAPELES: { ic: "📎", n: "Papeles" },
  DENUNCIA: { ic: "📄", n: "Denuncia" },
  PRESENTADO: { ic: "📨", n: "Reclamo presentado" },
  REITERADO: { ic: "🔁", n: "Reiterado" },
  INSPECCION: { ic: "🔍", n: "Inspección" },
  OFERTA: { ic: "💬", n: "Oferta" },
  CONTRAOFERTA: { ic: "↩️", n: "Contraoferta" },
  ACEPTADO: { ic: "🤝", n: "Aceptado" },
  CONVENIO: { ic: "✍️", n: "Convenio" },
  COBRADO: { ic: "💵", n: "Cobrado" },
  RECHAZADO: { ic: "⛔", n: "Rechazado" },
  DERIVADO: { ic: "↪️", n: "Derivado" },
  NOTA: { ic: "📝", n: "Nota" },
};

const ESTADOS = {
  PENDIENTE: "Faltan papeles",
  DENUNCIADO: "Denunciado",
  PRESENTADO: "Reclamo presentado",
  INSPECCION: "Inspección",
  LIQUIDACION: "En liquidación",
  CERRADO: "Cerrado",
};

// Palabras que no cortan la frase aunque lleven punto: "Av. José", "Thomas A. Vaca", "op. 12065420".
const ABREVIATURAS = new Set(["av", "avda", "esq", "op", "dr", "dra", "sr", "sra", "gral", "pje", "bv", "dpto", "depto", "prov", "pcia", "tel", "nro", "sto", "sta", "ing", "lic", "cnel", "tte"]);

// Etiquetas al principio del renglón que se ponen en negrita. Ej: "Tercero: …", "OJO: …".
const RE_ETIQUETA = /^(⚠️\s*)?(ojo|atenci[oó]n|importante|falta|faltan|tercero|choque|presupuesto|fotos|lesiones|papeles|p[oó]liza|cobertura|pendiente|pr[oó]ximo|antes de presentar|cliente|montos?|oferta|convenio|cobro|contacto|lugar|fecha|denuncia|nota)\s*:\s*/i;
const RE_OJO = /^(⚠️|ojo\b|atenci[oó]n\b|importante\b)/i;

/** "a. B" corta solo si "a" no es abreviatura ni una letra suelta. */
function partirFrases(txt) {
  const out = [];
  let desde = 0;
  const re = /\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡⚠])/g;
  let m;
  while ((m = re.exec(txt))) {
    const antes = txt.slice(desde, m.index);
    const ultima = (antes.match(/([\p{L}\d)]+)$/u) || [""])[0];
    const abrev = ABREVIATURAS.has(ultima.toLowerCase()) || /^\p{L}$/u.test(ultima);
    if (abrev) continue;
    out.push(txt.slice(desde, m.index + 1));
    desde = m.index + m[0].length;
  }
  out.push(txt.slice(desde));
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Corta en "; " solo fuera de paréntesis: "Choque en Equiza; Fiorino estacionada (Sancor; ROWING)" → 2 renglones. */
function partirPuntoYComa(txt) {
  const out = [];
  let prof = 0;
  let desde = 0;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (c === "(" || c === "«") prof++;
    else if ((c === ")" || c === "»") && prof > 0) prof--;
    else if (c === ";" && prof === 0) {
      out.push(txt.slice(desde, i));
      desde = i + 1;
    }
  }
  out.push(txt.slice(desde));
  return out.map((x) => x.trim()).filter(Boolean);
}

/** "['08 firmado', 'Exposición civil']" → ["08 firmado", "Exposición civil"]. */
function listaPython(txt) {
  const t = String(txt || "").trim();
  if (!/^\[.*\]$/s.test(t)) return null;
  const items = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(t))) items.push((m[1] ?? m[2] ?? "").trim());
  return items.filter(Boolean);
}

function renglon(txt) {
  let t = String(txt || "").trim().replace(/\.$/, "");
  if (!t) return null;
  const ojo = RE_OJO.test(t);
  let etiqueta = "";
  const m = t.match(RE_ETIQUETA);
  if (m) {
    etiqueta = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    t = t.slice(m[0].length);
  } else {
    // Sin dos puntos pero arranca con la palabra clave: "Presupuesto Diego & Titi …" → **Presupuesto:** Diego & Titi …
    const p = t.match(/^(choque|presupuesto|tercero|lesiones)\s+/i);
    if (p) {
      etiqueta = p[1].charAt(0).toUpperCase() + p[1].slice(1).toLowerCase();
      t = t.slice(p[0].length);
    }
  }
  return { etiqueta, txt: t, ojo };
}

/** Los cambios del portal: "Documentación pendiente: — → ['A', 'B']" → { etiqueta, items|txt }. */
function cambioPortal(txt) {
  const t = String(txt || "").trim();
  if (!t) return null;
  const i = t.indexOf(":");
  if (i < 0) return { etiqueta: "", txt: t };
  const etiqueta = t.slice(0, i).trim();
  let valor = t.slice(i + 1).trim();
  const flecha = valor.lastIndexOf("→");
  if (flecha >= 0 && /^(documentaci|etapas)/i.test(etiqueta)) valor = valor.slice(flecha + 1).trim();
  const items = listaPython(valor) || (/^(documentaci|etapas)/i.test(etiqueta) && valor.includes(";") ? valor.split(";").map((x) => x.trim()).filter(Boolean) : null);
  return items ? { etiqueta, items } : { etiqueta, txt: valor };
}

/**
 * Lee el texto de una nota.
 * → { via: "david-admin" | "", estado: "Denunciado" | "", titulo: {ic, n} | null, fecha: "13/11/2026" | "",
 *     renglones: [{ etiqueta, txt, ojo }], portal: [{ etiqueta, txt | items }] | null, cliente: "…" | "" }
 */
export function leerNota(texto) {
  let t = String(texto || "").trim();
  const r = { via: "", estado: "", titulo: null, fecha: "", renglones: [], portal: null, cliente: "" };

  const firma = t.match(/^\[(?:\d{1,2}\/\d{1,2}\s*·\s*)?([^\]]{1,60}?)\s+desde Claude\]\s*/);
  if (firma) {
    r.via = firma[1].trim();
    t = t.slice(firma[0].length);
  }
  const est = t.match(/^Estado\s*→\s*([A-ZÁÉÍÓÚ_]+)\.?\s*/);
  if (est) {
    r.estado = ESTADOS[est[1]] || est[1];
    t = t.slice(est[0].length);
  }

  const portal = t.match(/^Portal del cliente:\s*([\s\S]*)$/);
  if (portal) {
    r.titulo = { ic: "🧾", n: "Portal del cliente" };
    const cuerpo = portal[1].trim();
    const partes = cuerpo.includes("\n") ? cuerpo.split("\n") : cuerpo.split(/\s+·\s+(?=[A-ZÁÉÍÓÚÑ][^:]{2,40}:)/);
    r.portal = partes.map(cambioPortal).filter(Boolean);
    return r;
  }

  const rec = t.match(/^RECLAMO\s*·\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*·\s*([A-Za-zÁÉÍÓÚáéíóú]+)\s*(?:·\s*)?([\s\S]*)$/);
  if (rec) {
    const ev = rec[2].normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    r.titulo = EVENTOS[ev] || { ic: "📝", n: rec[2] };
    r.fecha = rec[1];
    t = rec[3];
  }

  const cli = t.split(/\bCLIENTE\s*:\s*/);
  if (cli.length > 1) {
    t = cli[0].replace(/[\s·]+$/, "");
    r.cliente = cli.slice(1).join(" ").trim();
  }

  const lineas = t.includes("\n") ? t.split("\n") : partirFrases(t).flatMap(partirPuntoYComa);
  r.renglones = lineas.map(renglon).filter(Boolean);
  return r;
}

/** La nota ya armada. Si no tiene nada especial, el texto tal cual. */
export default function NotaLegible({ texto }) {
  const n = leerNota(texto);
  const especial = n.titulo || n.estado || n.renglones.length > 1 || n.portal;
  if (!especial) {
    return <p className="whitespace-pre-line break-words text-[13.5px] leading-snug text-titulo dark:text-titulo-dark">{n.renglones[0]?.txt ? (n.renglones[0].etiqueta ? `${n.renglones[0].etiqueta}: ${n.renglones[0].txt}` : n.renglones[0].txt) : String(texto || "")}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5 text-[13.5px] leading-snug text-titulo dark:text-titulo-dark">
      {(n.titulo || n.estado) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {n.titulo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--acc)]/15 px-2 py-0.5 text-[12.5px] font-extrabold text-[var(--acc)]">
              <span aria-hidden="true">{n.titulo.ic}</span> {n.titulo.n}
            </span>
          )}
          {n.fecha && <span className="text-[12.5px] font-semibold text-suave dark:text-suave-dark">{n.fecha}</span>}
          {n.estado && (
            <span className="rounded-full bg-surface dark:bg-surface-dark px-2 py-0.5 text-[12px] font-bold text-suave dark:text-suave-dark">Estado → {n.estado}</span>
          )}
        </div>
      )}

      {n.portal ? (
        <ul className="flex flex-col gap-1">
          {n.portal.map((c, i) => (
            <li key={i}>
              {c.etiqueta && <b>{c.etiqueta}:</b>}{" "}
              {c.items ? (
                c.items.length ? (
                  <ul className="mt-0.5 list-disc pl-5">
                    {c.items.map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  "no falta nada"
                )
              ) : (
                c.txt
              )}
            </li>
          ))}
        </ul>
      ) : (
        n.renglones.length > 0 && (
          <ul className={`flex flex-col gap-1 ${n.renglones.length > 1 ? "list-disc pl-5" : ""}`}>
            {n.renglones.map((x, i) =>
              x.ojo ? (
                <li key={i} className={`${n.renglones.length > 1 ? "-ml-5 " : ""}list-none rounded-lg border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-2.5 py-1.5 font-semibold text-amber-900 dark:text-amber-200`}>
                  ⚠️ {x.etiqueta && !/^ojo$/i.test(x.etiqueta) ? <b>{x.etiqueta}: </b> : null}
                  {x.txt}
                </li>
              ) : (
                <li key={i} className="break-words">
                  {x.etiqueta && <b>{x.etiqueta}: </b>}
                  {x.txt}
                </li>
              ),
            )}
          </ul>
        )
      )}

      {n.cliente && (
        <p className="rounded-lg bg-surface dark:bg-surface-dark px-2.5 py-1.5 text-[12.5px] text-suave dark:text-suave-dark">
          👁️ <b>El cliente ve:</b> {n.cliente}
        </p>
      )}
    </div>
  );
}
