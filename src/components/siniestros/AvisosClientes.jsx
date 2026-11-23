// src/components/siniestros/AvisosClientes.jsx
//
// 📲 AVISOS DE CLIENTES (Franco 23/11/2026) — arriba de la planilla de Siniestros.
//
//   · «Copiar link» / «Mandar por WhatsApp»: el link de TU oficina para pasarle al cliente
//     cuando tiene un siniestro (/#/siniestro?of=2). Lo llena en 2 minutos desde el celu.
//   · Lo que mandan los clientes aparece acá («3 nuevos»). Tocás uno → ves todo (fotos,
//     datos del otro, mapa) y con un botón lo CARGÁS como siniestro (ya con las fotos y
//     los datos del otro). Si no es cliente: «Contactado» (posible reclamo nuevo) o «Descartar».
//   · El mail a Franco sale solo cuando llega el aviso (siniestros/aviso_cliente.py).
//   · Link directo desde el mail: /#/siniestros?aviso=7 → se abre ese aviso.
//
//   <AvisosClientes isWebAdmin onCargado={(res) => …} onVerSiniestro={(id) => …} />
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiArchive,
  HiChatAlt2,
  HiCheckCircle,
  HiChevronRight,
  HiClipboardCopy,
  HiDeviceMobile,
  HiExternalLink,
  HiLocationMarker,
  HiPhotograph,
  HiSearch,
} from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import Badge from "../ui/Badge";
import { linkWhatsApp, linkWhatsAppOElegir } from "../gestoria/gestoriaUtils";
import {
  buscarPolizas,
  cambiarEstadoAviso,
  cargarAviso,
  linkParaCliente,
  listarAvisos,
  mensajeError,
  resumenAvisos,
  verAviso,
} from "../../api/siniestrosAvisos";

const TONO_TIPO = { CHOCARON: "verde", CHOCO: "rojo", ROBO: "amarillo", INCENDIO: "amarillo", OTRO: "neutro" };
const TONO_ESTADO = { NUEVO: "azul", CARGADO: "verde", CONTACTADO: "violeta", DESCARTADO: "neutro" };

const ddmm = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
const siNo = (v) => (v === true ? "Sí" : v === false ? "No" : "");

function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const esImagen = (f) => {
  const u = String(f?.url || "").toLowerCase().split("?")[0];
  return !(String(f?.mime || "").includes("pdf") || u.endsWith(".pdf"));
};
const miniatura = (url, lado = 240) =>
  String(url || "").includes("/upload/") ? url.replace("/upload/", `/upload/c_fill,w_${lado},h_${lado},q_auto,f_auto/`) : url;

const ETIQUETA_TXT = {
  AUTO_ASEGURADO: "Su auto",
  AUTO_TERCERO: "El otro auto",
  DOC_TERCERO: "Papeles del otro",
  LUGAR: "El lugar",
  POLICIAL: "Denuncia policial",
  OTRO: "Otra",
};

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const t = document.createElement("textarea");
      t.value = texto;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand("copy");
      t.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ───────────── Tarjeta de la lista ───────────── */
function TarjetaAviso({ a, mostrarOficina, onAbrir }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(a)}
      className="group flex w-full flex-col gap-1.5 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3.5 py-3 text-left transition-colors hover:border-duo-violeta"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Badge tono={TONO_TIPO[a.tipo] || "neutro"} size="sm">
            {a.tipo_txt}
          </Badge>
          {a.estado !== "NUEVO" && (
            <Badge tono={TONO_ESTADO[a.estado] || "neutro"} size="sm">
              {a.estado_txt}
            </Badge>
          )}
        </span>
        <span className="text-[12px] text-suave dark:text-suave-dark">{haceCuanto(a.creado)}</span>
      </div>
      <p className="truncate text-[15px] font-extrabold text-titulo dark:text-titulo-dark">{a.nombre}</p>
      <p className="truncate text-[13px] text-titulo dark:text-titulo-dark">
        {[a.patente, a.fecha_hecho ? ddmm(a.fecha_hecho) : "", a.lugar].filter(Boolean).join(" · ") || "—"}
      </p>
      <div className="flex items-center justify-between gap-2 text-[12.5px]">
        <span className={a.es_cliente ? "text-duo-verde-sombra dark:text-duo-verde font-semibold" : "text-duo-violeta font-semibold"}>
          {a.es_cliente ? (a.poliza ? `✅ Cliente · ${a.poliza.compania || a.poliza.auto}` : "✅ Cliente (elegir póliza)") : "🆕 No es cliente"}
        </span>
        <span className="flex items-center gap-1 text-suave dark:text-suave-dark">
          {a.fotos?.length ? (
            <>
              <HiPhotograph className="h-4 w-4" /> {a.fotos.length}
            </>
          ) : null}
          <HiChevronRight className="h-4 w-4 opacity-60 group-hover:opacity-100" />
        </span>
      </div>
      {mostrarOficina && <p className="text-[12px] text-suave dark:text-suave-dark">🏢 {a.oficina_nombre || "Sin oficina"}</p>}
    </button>
  );
}

/* ───────────── Elegir la póliza (si no la encontró solo) ───────────── */
function ElegirPoliza({ aviso, elegida, onElegir }) {
  const [q, setQ] = useState(aviso?.patente || aviso?.dni || "");
  const [res, setRes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const texto = q.trim();
    if (texto.replace(/\s/g, "").length < 2) {
      setRes([]);
      return undefined;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      buscarPolizas(texto)
        .then((r) => vivo && setRes(r))
        .catch(() => vivo && setRes([]))
        .finally(() => vivo && setBuscando(false));
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3">
        <HiSearch className="h-4 w-4 text-suave dark:text-suave-dark" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Patente, DNI o apellido"
          className="min-h-[44px] w-full bg-transparent text-[14px] text-titulo dark:text-titulo-dark outline-none"
        />
      </label>
      {buscando && <p className="text-[12.5px] text-suave dark:text-suave-dark">Buscando…</p>}
      {!buscando && q.trim().length >= 2 && res.length === 0 && (
        <p className="text-[12.5px] text-suave dark:text-suave-dark">No aparece ninguna póliza. Si no es cliente, marcalo «Contactado».</p>
      )}
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {res.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onElegir(p)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] ${
              elegida?.id === p.id
                ? "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-duo-violeta"
            }`}
          >
            <span className="min-w-0">
              <b className="text-titulo dark:text-titulo-dark">{p.patente}</b>{" "}
              <span className="text-titulo dark:text-titulo-dark">
                {p.cliente ? `${p.cliente.apellido || ""}, ${p.cliente.nombre || ""}` : ""}
              </span>
              <span className="block truncate text-suave dark:text-suave-dark">
                {[p.marca, p.modelo, p.anio].filter(Boolean).join(" ")} · {p.compania_nombre} · {p.oficina_nombre} · {p.estado}
              </span>
            </span>
            {elegida?.id === p.id && <HiCheckCircle className="h-5 w-5 shrink-0 text-duo-verde" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Detalle (modal) ───────────── */
function Fila({ k, v, children }) {
  if (!v && !children) return null;
  return (
    <div className="flex gap-3 py-1.5 text-[13.5px]">
      <span className="w-28 shrink-0 text-suave dark:text-suave-dark">{k}</span>
      <span className="min-w-0 whitespace-pre-line break-words text-titulo dark:text-titulo-dark">{children || v}</span>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-suave dark:text-suave-dark">{titulo}</p>
      <div className="divide-y divide-linea dark:divide-linea-dark rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3.5">
        {children}
      </div>
    </div>
  );
}

function DetalleAviso({ aviso, onCerrar, onCambio, onCargado, onVerSiniestro }) {
  const [elegida, setElegida] = useState(null);
  const [cambiarPoliza, setCambiarPoliza] = useState(false);
  const [trabajando, setTrabajando] = useState("");
  const [pidiendoNota, setPidiendoNota] = useState(""); // "CONTACTADO" | "DESCARTADO" | ""
  const [nota, setNota] = useState("");

  useEffect(() => {
    setElegida(null);
    setCambiarPoliza(false);
    setPidiendoNota("");
    setNota("");
  }, [aviso?.id]);

  if (!aviso) return null;
  const a = aviso;
  const cerrado = a.estado === "CARGADO";
  const polizaFinal = elegida || (!cambiarPoliza ? a.poliza : null);
  const choque = a.tipo === "CHOCO" || a.tipo === "CHOCARON";
  const textoCliente = `Hola ${String(a.nombre || "").split(" ")[0]}! Te escribimos por el siniestro que nos avisaste (aviso #${a.id}).`;

  const cargar = async () => {
    if (!polizaFinal?.id || trabajando) return;
    setTrabajando("cargar");
    try {
      const r = await cargarAviso(a.id, polizaFinal.id);
      toast.success(`Cargado como siniestro #${r.siniestro_id}`);
      onCambio(r.aviso);
      onCargado?.(r);
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setTrabajando("");
    }
  };
  const estado = async (nuevo) => {
    if (trabajando) return;
    setTrabajando(nuevo);
    try {
      const r = await cambiarEstadoAviso(a.id, nuevo, nuevo === "NUEVO" ? "" : nota);
      setPidiendoNota("");
      setNota("");
      toast.success(nuevo === "NUEVO" ? "Volvió a nuevos" : r.estado_txt);
      onCambio(r);
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setTrabajando("");
    }
  };

  return (
    <ModalDuo
      isOpen={!!aviso}
      onClose={onCerrar}
      title={`Aviso #${a.id} · ${a.tipo_txt}`}
      subtitle={[a.nombre, haceCuanto(a.creado), a.oficina_nombre].filter(Boolean).join(" · ")}
      icon={<HiDeviceMobile className="w-5 h-5" />}
      iconTono={TONO_TIPO[a.tipo] === "rojo" ? "rojo" : TONO_TIPO[a.tipo] === "verde" ? "verde" : "amarillo"}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono={TONO_ESTADO[a.estado] || "neutro"}>{a.estado_txt}</Badge>
          <Badge tono={TONO_TIPO[a.tipo] || "neutro"}>Culpa: {a.culpa}</Badge>
          {a.por_portal && <Badge tono="azul">Desde su portal</Badge>}
        </div>

        <Seccion titulo="Quién avisa">
          <Fila k="Nombre" v={a.nombre} />
          <Fila k="DNI" v={a.dni} />
          <Fila k="WhatsApp" v={a.telefono}>
            {a.telefono ? (
              <a
                href={linkWhatsApp(a.telefono, textoCliente) || `https://wa.me/?text=${encodeURIComponent(textoCliente)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-duo-verde-sombra dark:text-duo-verde underline underline-offset-2"
              >
                <HiChatAlt2 className="h-4 w-4" /> {a.telefono}
              </a>
            ) : null}
          </Fila>
          <Fila k="Patente" v={a.patente} />
        </Seccion>

        <Seccion titulo="Qué pasó">
          <Fila k="Tipo" v={a.tipo_txt} />
          <Fila k="Cuándo" v={[ddmm(a.fecha_hecho), a.hora_hecho ? `${a.hora_hecho} hs` : ""].filter(Boolean).join(" · ")} />
          <Fila k="Dónde" v={a.lugar || (a.mapa ? "Ubicación del GPS" : "")}>
            {a.lugar || a.mapa ? (
              <>
                {a.lugar}
                {a.mapa ? (
                  <a href={a.mapa} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-semibold text-duo-azul underline underline-offset-2">
                    <HiLocationMarker className="h-4 w-4" /> Ver mapa
                  </a>
                ) : null}
              </>
            ) : null}
          </Fila>
          <Fila k="Heridos" v={siNo(a.heridos)} />
          <Fila k={a.tipo === "ROBO" ? "Denuncia policial" : "Policía"} v={siNo(a.policia)} />
          <Fila k="Lo que contó" v={a.relato} />
        </Seccion>

        {choque && (
          <Seccion titulo="El otro">
            {[a.tercero?.nombre, a.tercero?.telefono, a.tercero?.patente, a.tercero?.compania].some(Boolean) ? (
              <>
                <Fila k="Patente" v={a.tercero?.patente} />
                <Fila k="Compañía" v={a.tercero?.compania} />
                <Fila k="Nombre" v={a.tercero?.nombre} />
                <Fila k="Teléfono" v={a.tercero?.telefono} />
              </>
            ) : (
              <p className="py-2 text-[13px] text-suave dark:text-suave-dark">No mandó datos del otro (fijate en las fotos).</p>
            )}
          </Seccion>
        )}

        {a.fotos?.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-suave dark:text-suave-dark">Fotos ({a.fotos.length})</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {a.fotos.map((f, i) => (
                <a
                  key={`${f.url}-${i}`}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-square overflow-hidden rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                  title={ETIQUETA_TXT[f.etiqueta] || "Foto"}
                >
                  {esImagen(f) ? (
                    <img src={miniatura(f.url)} alt={ETIQUETA_TXT[f.etiqueta] || "Foto"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[12px] font-bold text-suave">PDF</span>
                  )}
                  {f.etiqueta ? (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                      {ETIQUETA_TXT[f.etiqueta] || f.etiqueta}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        )}

        {a.nota_interna ? (
          <p className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3.5 py-2.5 text-[13px] text-titulo dark:text-titulo-dark">
            📝 {a.nota_interna}
            {a.revisado_por ? <span className="text-suave dark:text-suave-dark"> — {a.revisado_por}</span> : null}
          </p>
        ) : null}

        {/* ── Cargar como siniestro ── */}
        {cerrado ? (
          <Boton3D variant="verde" full onClick={() => onVerSiniestro?.(a.siniestro)}>
            <HiExternalLink className="h-4 w-4" /> Ver el siniestro #{a.siniestro}
          </Boton3D>
        ) : (
          <div className="space-y-3 rounded-xl border border-duo-verde/40 bg-duo-verde-soft/40 dark:bg-[var(--color-duo-verde-soft-dark)] p-3.5">
            <p className="text-[14px] font-bold text-titulo dark:text-titulo-dark">Cargarlo como siniestro</p>
            {a.poliza && !cambiarPoliza && !elegida ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <b className="text-titulo dark:text-titulo-dark">{a.poliza.patente}</b>{" "}
                  <span className="text-titulo dark:text-titulo-dark">{a.cliente?.nombre}</span>
                  <span className="block truncate text-suave dark:text-suave-dark">
                    {[a.poliza.auto, a.poliza.compania, a.poliza.numero_poliza, a.poliza.estado].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <button type="button" className="shrink-0 text-[13px] font-bold text-duo-azul underline" onClick={() => setCambiarPoliza(true)}>
                  Cambiar
                </button>
              </div>
            ) : (
              <ElegirPoliza aviso={a} elegida={elegida} onElegir={setElegida} />
            )}
            <Boton3D variant="verde" full onClick={cargar} disabled={!polizaFinal?.id || !!trabajando}>
              {trabajando === "cargar" ? "Cargando…" : "Cargar como siniestro"}
            </Boton3D>
            <p className="text-[12px] text-suave dark:text-suave-dark">Se carga con sus fotos y los datos del otro. Después lo revisa Franco, como siempre.</p>
          </div>
        )}

        {!cerrado && pidiendoNota && (
          <div className="space-y-2 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
            <label className="block text-[13px] font-semibold text-titulo dark:text-titulo-dark" htmlFor="aviso-nota">
              {pidiendoNota === "DESCARTADO" ? "¿Por qué se descarta? (opcional)" : "¿Qué hablaste con él? (opcional)"}
            </label>
            <textarea
              id="aviso-nota"
              rows={2}
              maxLength={500}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={pidiendoNota === "DESCARTADO" ? "Ej: era una prueba / ya estaba cargado" : "Ej: lo llamé, viene el jueves con los papeles"}
              className="w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta"
            />
            <div className="flex gap-2">
              <Boton3D variant="blanco" full onClick={() => setPidiendoNota("")} disabled={!!trabajando}>
                Cancelar
              </Boton3D>
              <Boton3D variant={pidiendoNota === "DESCARTADO" ? "rojo" : "violeta"} full onClick={() => estado(pidiendoNota)} disabled={!!trabajando}>
                {trabajando ? "Guardando…" : pidiendoNota === "DESCARTADO" ? "Descartar" : "Marcar contactado"}
              </Boton3D>
            </div>
          </div>
        )}

        {!cerrado && !pidiendoNota && (
          <div className="flex gap-2">
            {a.estado === "NUEVO" ? (
              <>
                <Boton3D variant="blanco" full onClick={() => setPidiendoNota("CONTACTADO")} disabled={!!trabajando}>
                  <HiChatAlt2 className="h-4 w-4" /> Contactado
                </Boton3D>
                <Boton3D variant="blanco" full onClick={() => setPidiendoNota("DESCARTADO")} disabled={!!trabajando}>
                  <HiArchive className="h-4 w-4" /> Descartar
                </Boton3D>
              </>
            ) : (
              <Boton3D variant="blanco" full onClick={() => estado("NUEVO")} disabled={!!trabajando}>
                Volver a nuevos
              </Boton3D>
            )}
          </div>
        )}
      </div>
    </ModalDuo>
  );
}

/* ───────────── El bloque de arriba de la planilla ───────────── */
export default function AvisosClientes({ isWebAdmin = false, onCargado, onVerSiniestro }) {
  const [sp, setSp] = useSearchParams();
  const [resumen, setResumen] = useState(null);
  const [lista, setLista] = useState([]);
  const [historial, setHistorial] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  const traer = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([resumenAvisos(), listarAvisos(historial ? "todos" : "NUEVO")]);
      setResumen(r);
      setLista(l);
    } catch (e) {
      if (e?.response?.status === 403) setSinPermiso(true);
    }
  }, [historial]);

  useEffect(() => {
    traer();
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") traer();
    }, 90_000);
    return () => clearInterval(id);
  }, [traer]);

  // 📧 Link del mail: /#/siniestros?aviso=7 → abre ese aviso.
  const avisoUrl = sp.get("aviso");
  useEffect(() => {
    if (!avisoUrl) return;
    let vivo = true;
    verAviso(avisoUrl)
      .then((a) => vivo && setAbierto(a))
      .catch(() => vivo && toast.error("No encontramos ese aviso (o es de otra oficina)."));
    return () => {
      vivo = false;
    };
  }, [avisoUrl]);

  const cerrar = () => {
    setAbierto(null);
    if (sp.get("aviso")) {
      const p = new URLSearchParams(sp);
      p.delete("aviso");
      setSp(p, { replace: true });
    }
  };

  const link = useMemo(() => linkParaCliente(resumen?.link_path), [resumen]);
  const textoLink = `Hola! Si tuviste un siniestro, avisanos desde acá en 2 minutos y te ayudamos al toque 👉 ${link}`;

  if (sinPermiso) return null;
  const nuevos = resumen?.nuevos || 0;

  return (
    <section className="rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]">
            <HiDeviceMobile className="text-duo-azul text-xl" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-titulo dark:text-titulo-dark">
              Avisos de clientes
              {nuevos > 0 && (
                <Badge tono="rojo" size="sm">
                  {nuevos} nuevo{nuevos === 1 ? "" : "s"}
                </Badge>
              )}
            </p>
            <p className="text-[12.5px] text-suave dark:text-suave-dark">
              Cuando un cliente tiene un siniestro, mandale el link: lo llena en 2 minutos y aparece acá.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton3D
            variant="blanco"
            size="sm"
            onClick={async () => ((await copiar(link)) ? toast.success("Link copiado") : toast.error("No se pudo copiar"))}
          >
            <HiClipboardCopy className="h-4 w-4" /> Copiar link
          </Boton3D>
          <a
            href={linkWhatsAppOElegir("", textoLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-duo-verde px-3.5 text-[13.5px] font-bold text-white hover:bg-duo-verde-sombra"
          >
            <HiChatAlt2 className="h-4 w-4" /> Mandar link por WhatsApp
          </a>
          <Boton3D variant="blanco" size="sm" onClick={() => setHistorial((h) => !h)}>
            {historial ? "Solo nuevos" : "Historial"}
          </Boton3D>
        </div>
      </div>

      {lista.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((a) => (
            <TarjetaAviso key={a.id} a={a} mostrarOficina={isWebAdmin} onAbrir={setAbierto} />
          ))}
        </div>
      ) : historial ? (
        <p className="text-[13px] text-suave dark:text-suave-dark">Todavía no llegó ningún aviso.</p>
      ) : null}

      <DetalleAviso
        aviso={abierto}
        onCerrar={cerrar}
        onCambio={(a) => {
          setAbierto(a);
          traer();
        }}
        onCargado={(r) => {
          cerrar();
          onCargado?.(r);
        }}
        onVerSiniestro={(id) => {
          // El que abre el siniestro también saca ?aviso= de la dirección (si no, se vuelve a abrir).
          setAbierto(null);
          onVerSiniestro?.(id);
        }}
      />
    </section>
  );
}
