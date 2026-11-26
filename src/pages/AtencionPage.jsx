/* src/pages/AtencionPage.jsx
 *
 * ⭐ ATENCIÓN (solo admin, 25/11/2026) — lo que dicen los clientes de cómo los atendieron.
 *
 *   · QUEJAS: la bandeja de reclamos (los ve SOLO el admin). Cada una con quién lo atendió,
 *     las estrellas que puso, el botón para escribirle por WhatsApp y una nota interna.
 *     Estados: Nueva → En gestión → Resuelta.
 *   · OPINIONES: todas las estrellas del mes con su comentario. «Esconder» saca del ranking
 *     una opinión trucha (ej. un empleado que se votó a sí mismo).
 *   · QR Y FOTOS: el QR de cada oficina para imprimir y pegar en el mostrador, y la foto de
 *     cada empleado (el cliente toca la foto de quien lo atendió). Sin foto ve la inicial.
 *
 *   Backend: opiniones/views.py. El ranking «Mejor atención» está en /ranking → Atención.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import {
  HiCamera,
  HiChatAlt2,
  HiClipboardCopy,
  HiEye,
  HiEyeOff,
  HiPrinter,
  HiQrcode,
  HiStar,
  HiTrash,
} from "react-icons/hi";
import { LuMessageCircle } from "react-icons/lu";

import useDatosVivos from "../hooks/useDatosVivos";
import { UI } from "../components/tareas/tareasUI";
import {
  PREMIO_TXT,
  esconderOpinion,
  guardarFoto,
  guardarQueja,
  pedirEmpleados,
  pedirOpiniones,
  pedirQrs,
  pedirQuejas,
} from "../services/opiniones";
import { uploadToCloudinary } from "../utils/cloudinary";
import { comprimirImagen } from "../utils/comprimirImagen";
import logoThames from "../assets/logos/horiz-rojo-negro.webp";
import logoMalvinas from "../assets/logos/malvinas_logo.svg";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const nombreMes = (m) => MESES[Number(String(m).split("-")[1]) - 1] || "";
const fechaHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const telVisible = (t) => {
  const d = String(t || "").replace(/\D/g, "");
  return d.startsWith("549") ? `${d.slice(3, 5)} ${d.slice(5, 9)}-${d.slice(9)}` : d;
};
const inicial = (n) => (n || "?").trim().charAt(0).toUpperCase();

const ESTADOS = [
  { id: "NUEVA", txt: "Nuevas", chip: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo" },
  { id: "EN_GESTION", txt: "En gestión", chip: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo" },
  { id: "RESUELTA", txt: "Resueltas", chip: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde" },
];
const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.id, e]));

function Estrellas({ n, chico = false }) {
  if (!n) return null;
  return (
    <span className="inline-flex" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <HiStar key={i} className={`${chico ? "h-3.5 w-3.5" : "h-4 w-4"} ${i <= n ? "text-[#f59e0b]" : "text-linea dark:text-linea-dark"}`} />
      ))}
    </span>
  );
}

function Pestanas({ vista, setVista, nuevas }) {
  const items = [
    ["quejas", "Quejas", HiChatAlt2],
    ["opiniones", "Opiniones", HiStar],
    ["qr", "QR y fotos", HiQrcode],
  ];
  return (
    <div role="tablist" className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1">
      {items.map(([id, txt, Icono]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={vista === id}
          onClick={() => setVista(id)}
          className={`relative flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-colors ${
            vista === id
              ? "bg-titulo text-white dark:bg-titulo-dark dark:text-surface-dark"
              : "text-suave hover:bg-surface dark:text-suave-dark dark:hover:bg-surface-dark"
          }`}
        >
          <Icono className="h-4 w-4" /> {txt}
          {id === "quejas" && nuevas > 0 ? (
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-duo-rojo px-1 text-[11px] font-bold text-white">{nuevas}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── QUEJAS ───────────────────────── */
function Queja({ q, onCambio }) {
  const [nota, setNota] = useState(q.nota || "");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setNota(q.nota || ""), [q.nota]);

  const guardar = async (cambios) => {
    setGuardando(true);
    try {
      onCambio(await guardarQueja(q.id, cambios));
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const saludo = `Buenas tardes${q.nombre ? `, ${q.nombre.split(" ")[0]}` : ""}. Le escribo por el reclamo que nos dejó sobre la atención en ${q.oficina || "la oficina"}. `;
  const wa = q.telefono ? `https://wa.me/${q.telefono}?text=${encodeURIComponent(saludo)}` : "";

  return (
    <li className={`${UI.card} p-3.5`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${ESTADO[q.estado]?.chip || ""}`}>{ESTADO[q.estado]?.txt.replace(/s$/, "") || q.estado}</span>
        <span className={UI.txtSuave}>{fechaHora(q.creado_en)}</span>
        <span className={UI.txtSuave}>· {q.oficina || "Sin oficina"}</span>
        {q.estrellas ? <Estrellas n={q.estrellas} chico /> : null}
        <span className={`ml-auto ${UI.txtSuave}`}>{q.canal === "QR" ? "QR en la oficina" : "Link"}</span>
      </div>
      <p className={`mt-2 whitespace-pre-line text-[15px] leading-relaxed ${UI.txtTitulo}`}>{q.texto}</p>
      <p className={`mt-2 text-[13px] ${UI.txtSuave}`}>
        <b className={UI.txtTitulo}>{q.nombre || "Sin nombre"}</b>
        {q.telefono ? ` · ${telVisible(q.telefono)}` : ""}
        {q.empleado ? (
          <>
            {" "}· lo atendió <b className={UI.txtTitulo}>{q.empleado}</b>
          </>
        ) : null}
      </p>
      <textarea
        className={`${UI.input} mt-3 h-auto min-h-[64px] py-2.5`}
        placeholder="Nota interna (qué se hizo, a quién se llamó…)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (q.nota || "") && guardar({ nota })}
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-3.5 text-[13px] font-bold text-[#06240F]"
          >
            <LuMessageCircle className="h-4 w-4" /> Escribirle
          </a>
        ) : null}
        {ESTADOS.filter((e) => e.id !== q.estado).map((e) => (
          <button
            key={e.id}
            type="button"
            disabled={guardando}
            onClick={() => guardar({ estado: e.id, nota })}
            className={`h-10 rounded-lg px-3.5 text-[13px] ${UI.btnGhost}`}
          >
            {e.id === "RESUELTA" ? "Marcar resuelta" : e.id === "EN_GESTION" ? "En gestión" : "Volver a nueva"}
          </button>
        ))}
      </div>
    </li>
  );
}

function Quejas({ onConteo }) {
  const [estado, setEstado] = useState("NUEVA");
  const [datos, setDatos] = useState(null);
  const cargar = async () => {
    try {
      const d = await pedirQuejas(estado === "TODAS" ? "" : estado);
      setDatos(d);
      onConteo(d?.conteo?.NUEVA || 0);
    } catch {
      toast.error("No se pudieron cargar las quejas");
    }
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
  useDatosVivos(["quejas"], () => cargar(), { cadaMs: 15_000 });

  const conteo = datos?.conteo || {};
  const lista = datos?.resultados || [];
  const cambio = (q) => {
    setDatos((d) => ({
      ...d,
      resultados: (d?.resultados || []).map((x) => (x.id === q.id ? q : x)).filter((x) => estado === "TODAS" || x.estado === estado),
    }));
    cargar();
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[...ESTADOS, { id: "TODAS", txt: "Todas" }].map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEstado(e.id)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
              estado === e.id ? "border-marca bg-marca/10 text-marca" : `border-linea dark:border-linea-dark ${UI.txtSuave}`
            }`}
          >
            {e.txt}
            {e.id !== "TODAS" ? ` · ${conteo[e.id] || 0}` : ""}
          </button>
        ))}
      </div>
      {!datos ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio texto={estado === "NUEVA" ? "No hay quejas nuevas. 🙌" : "No hay quejas acá."} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {lista.map((q) => (
            <Queja key={q.id} q={q} onCambio={cambio} />
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────────────────────── OPINIONES ───────────────────────── */
function Opiniones() {
  const hoy = useMemo(() => new Date(), []);
  const meses = [mesDe(hoy), mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))];
  const [mes, setMes] = useState(meses[0]);
  const [soloComentario, setSoloComentario] = useState(false);
  const [lista, setLista] = useState(null);

  const cargar = async () => {
    try {
      const d = await pedirOpiniones({ mes, todas: 1, ...(soloComentario ? { con_comentario: 1 } : {}) });
      setLista(d?.resultados || []);
    } catch {
      toast.error("No se pudieron cargar las opiniones");
    }
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, soloComentario]);
  useDatosVivos(["opiniones"], () => cargar(), { cadaMs: 30_000 });

  const alternar = async (o) => {
    try {
      const nuevo = await esconderOpinion(o.id, !o.oculta);
      setLista((l) => l.map((x) => (x.id === o.id ? nuevo : x)));
      toast.success(nuevo.oculta ? "Escondida: ya no cuenta para el ranking" : "Vuelve a contar");
    } catch {
      toast.error("No se pudo cambiar");
    }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {meses.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMes(m)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium capitalize ${
              mes === m ? "border-marca bg-marca/10 text-marca" : `border-linea dark:border-linea-dark ${UI.txtSuave}`
            }`}
          >
            {nombreMes(m)}
          </button>
        ))}
        <label className={`ml-auto flex items-center gap-2 text-[12px] ${UI.txtSuave}`}>
          <input type="checkbox" checked={soloComentario} onChange={(e) => setSoloComentario(e.target.checked)} />
          Solo con comentario
        </label>
      </div>
      {!lista ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio texto={`No hay opiniones en ${nombreMes(mes)}.`} />
      ) : (
        <ul className={`${UI.card} divide-y divide-linea dark:divide-linea-dark`}>
          {lista.map((o) => (
            <li key={o.id} className={`px-3.5 py-3 ${o.oculta ? "opacity-45" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                <Estrellas n={o.estrellas} />
                <b className={`text-[13px] ${UI.txtTitulo}`}>{o.empleado || "Sin empleado"}</b>
                <span className={UI.txtSuave}>· {o.oficina}</span>
                <span className={`ml-auto ${UI.txtSuave}`}>{fechaHora(o.creado_en)}</span>
              </div>
              {[...(o.gusto || []), ...(o.mejorar || [])].length ? (
                <p className="mt-1.5 flex flex-wrap gap-1">
                  {(o.gusto || []).map((t) => (
                    <span key={t} className="rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2 py-0.5 text-[11px] font-medium text-duo-verde">
                      {t}
                    </span>
                  ))}
                  {(o.mejorar || []).map((t) => (
                    <span key={t} className="rounded-full bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-2 py-0.5 text-[11px] font-medium text-duo-rojo">
                      {t}
                    </span>
                  ))}
                </p>
              ) : null}
              {o.comentario ? <p className={`mt-1.5 text-[14px] ${UI.txtTitulo}`}>«{o.comentario}»</p> : null}
              <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-[12px] ${UI.txtSuave}`}>
                <span>
                  {o.nombre || "Sin nombre"}
                  {o.telefono ? ` · ${telVisible(o.telefono)}` : ""} · {o.canal === "QR" ? "QR" : "Link"}
                  {o.tiene_queja ? " · con queja" : ""}
                </span>
                <button type="button" onClick={() => alternar(o)} className="ml-auto flex items-center gap-1 font-semibold hover:text-marca">
                  {o.oculta ? <HiEye className="h-4 w-4" /> : <HiEyeOff className="h-4 w-4" />}
                  {o.oculta ? "Volver a contar" : "Esconder"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────────────────────── QR Y FOTOS ───────────────────────── */
const escapar = (t) =>
  String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function imprimirCartel(oficina, dataUrl) {
  const malvinas = oficina.marca === "malvinas";
  const logo = new URL(malvinas ? logoMalvinas : logoThames, window.location.href).href;
  const color = malvinas ? "#1E6B2E" : "#C1121F";
  const w = window.open("", "_blank", "width=720,height=980");
  if (!w) {
    toast.error("El navegador bloqueó la ventana. Permití las ventanas emergentes.");
    return;
  }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QR ${escapar(oficina.nombre)}</title>
<style>
  @page { size: A5 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Arial Narrow", Arial, sans-serif; color: #111; text-align: center; }
  .c { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8mm 4mm; }
  img.logo { height: ${malvinas ? 70 : 44}px; }
  h1 { margin: 6px 0 0; font-size: 40px; line-height: .95; text-transform: uppercase; letter-spacing: .01em; }
  h1 span { color: ${color}; }
  p { margin: 0; font-size: 17px; max-width: 30ch; }
  .estrellas { font-size: 34px; color: #f59e0b; letter-spacing: 4px; }
  img.qr { width: 62mm; height: 62mm; image-rendering: pixelated; border: 3px solid #111; border-radius: 10px; padding: 3mm; }
  .of { font-weight: 700; font-size: 15px; letter-spacing: .18em; text-transform: uppercase; color: #555; }
</style></head><body><div class="c">
  <img class="logo" src="${logo}" alt="">
  <h1>¿Cómo lo <span>atendimos?</span></h1>
  <div class="estrellas">★★★★★</div>
  <img class="qr" src="${dataUrl}" alt="QR">
  <p>Escanee el código con la cámara, toque la foto de quien lo atendió y puntúe. Le lleva un minuto.</p>
  <div class="of">${escapar(oficina.nombre)}</div>
</div><script>window.onload = () => setTimeout(() => window.print(), 300);</script></body></html>`);
  w.document.close();
}

function TarjetaQr({ oficina }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(oficina.url, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [oficina.url]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(oficina.url);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className={`${UI.card} flex gap-3 p-3`}>
      {qr ? (
        <img src={qr} alt={`QR de ${oficina.nombre}`} className="h-24 w-24 flex-none rounded-md bg-white p-1" />
      ) : (
        <span className="h-24 w-24 flex-none animate-pulse rounded-md bg-linea dark:bg-linea-dark" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold ${UI.txtTitulo}`}>{oficina.nombre}</p>
        <p className={`text-[12px] ${oficina.con_foto < oficina.empleados ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : UI.txtSuave}`}>
          {oficina.con_foto} de {oficina.empleados} con foto
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={!qr}
            onClick={() => imprimirCartel(oficina, qr)}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] ${UI.btnPrimary}`}
          >
            <HiPrinter className="h-4 w-4" /> Imprimir cartel
          </button>
          <button type="button" onClick={copiar} className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] ${UI.btnGhost}`}>
            <HiClipboardCopy className="h-4 w-4" /> Copiar link
          </button>
          <a
            href={oficina.url}
            target="_blank"
            rel="noreferrer"
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] ${UI.btnGhost}`}
          >
            Probar
          </a>
        </div>
      </div>
    </div>
  );
}

function FotoEmpleado({ e, onCambio }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Tiene que ser una foto");
      return;
    }
    setSubiendo(true);
    try {
      const chica = await comprimirImagen(file, { max: 600, calidad: 0.85 });
      const r = await uploadToCloudinary(chica, "thames/empleados");
      onCambio(await guardarFoto(e.id, { foto_url: r.secure_url, foto_public_id: r.public_id }));
      toast.success(`Foto de ${e.nombre.split(" ")[0]} lista`);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  };
  const quitar = async () => {
    try {
      onCambio(await guardarFoto(e.id, { foto_url: "" }));
    } catch {
      toast.error("No se pudo quitar");
    }
  };

  return (
    <li className="flex flex-col items-center gap-1.5 text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-marca/10 text-[22px] font-bold text-marca ring-2 ring-linea dark:ring-linea-dark"
        aria-label={`Cambiar la foto de ${e.nombre}`}
      >
        {e.foto ? <img src={e.foto} alt="" className="h-full w-full object-cover" /> : inicial(e.nombre)}
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <HiCamera className="h-5 w-5" />
        </span>
        {subiendo ? (
          <span className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </span>
        ) : null}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(ev) => subir(ev.target.files?.[0])} />
      <span className={`max-w-[84px] truncate text-[12px] font-medium ${UI.txtTitulo}`}>{e.nombre.split(" ")[0]}</span>
      {e.foto ? (
        <button type="button" onClick={quitar} className={`flex items-center gap-0.5 text-[11px] ${UI.txtSuave} hover:text-duo-rojo`}>
          <HiTrash className="h-3 w-3" /> quitar
        </button>
      ) : (
        <span className="text-[11px] text-duo-amarillo-sombra dark:text-duo-amarillo">sin foto</span>
      )}
    </li>
  );
}

function QrYFotos() {
  const [oficinas, setOficinas] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const cargar = async () => {
    try {
      const [q, e] = await Promise.all([pedirQrs(), pedirEmpleados()]);
      setOficinas(q?.oficinas || []);
      setEmpleados(e?.resultados || []);
    } catch {
      toast.error("No se pudo cargar");
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  const porOficina = useMemo(() => {
    const m = new Map();
    for (const e of empleados) m.set(e.oficina_id, [...(m.get(e.oficina_id) || []), e]);
    return m;
  }, [empleados]);

  const cambio = (nuevo) => {
    setEmpleados((l) => l.map((x) => (x.id === nuevo.id ? { ...x, foto: nuevo.foto } : x)));
    pedirQrs().then((q) => setOficinas(q?.oficinas || [])).catch(() => {});
  };

  if (!oficinas) return <Cargando />;
  return (
    <div className="flex flex-col gap-4">
      <p className={`text-[13px] ${UI.txtSuave}`}>
        Imprimí el cartel y pegalo en el mostrador. El cliente lo escanea, toca la foto de quien lo atendió y
        puntúa. Tocá cada círculo para subir la foto.
      </p>
      {oficinas.map((o) => (
        <section key={o.id} className="flex flex-col gap-2.5">
          <TarjetaQr oficina={o} />
          {(porOficina.get(o.id) || []).length ? (
            <ul className={`${UI.card} grid grid-cols-4 gap-3 p-3 sm:grid-cols-6`}>
              {(porOficina.get(o.id) || []).map((e) => (
                <FotoEmpleado key={e.id} e={e} onCambio={cambio} />
              ))}
            </ul>
          ) : (
            <p className={`px-1 text-[12px] ${UI.txtSuave}`}>Esta oficina no tiene empleados cargados (Configuración → Responsables).</p>
          )}
        </section>
      ))}
    </div>
  );
}

function Cargando() {
  return (
    <div className="flex justify-center py-12">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-marca" />
    </div>
  );
}
function Vacio({ texto }) {
  return <div className={`${UI.card} p-6 text-center text-[14px] ${UI.txtSuave}`}>{texto}</div>;
}

export default function AtencionPage() {
  const [vista, setVista] = useState("quejas");
  const [nuevas, setNuevas] = useState(0);

  return (
    <div className={`${UI.screen} px-4 py-5`}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 className={`flex items-center gap-2 text-xl font-semibold ${UI.txtTitulo}`}>
            <HiStar className="text-[#f59e0b]" /> Atención a clientes
          </h1>
          <Link to="/ranking" state={{ vista: "atencion" }} className="text-[13px] font-semibold text-marca hover:underline">
            Ver ranking
          </Link>
        </div>
        <p className={`mb-4 text-[13px] ${UI.txtSuave}`}>
          Las quejas las ves solo vos. {PREMIO_TXT} (ranking «Mejor atención»).
        </p>
        <Pestanas vista={vista} setVista={setVista} nuevas={nuevas} />
        {vista === "quejas" ? <Quejas onConteo={setNuevas} /> : vista === "opiniones" ? <Opiniones /> : <QrYFotos />}
      </div>
    </div>
  );
}
