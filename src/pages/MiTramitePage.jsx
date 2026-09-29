// src/pages/MiTramitePage.jsx
//
// 🔗 "MI TRÁMITE" — página pública, sin login. El cliente entra con el link
// que le pasa la oficina: /#/mi-tramite/<token>
//
// Muestra cómo va su trámite de gestoría (pasos, novedades) y le deja subir
// fotos/papeles (y el comprobante de lo que le pagó a la gestoría, solo con
// las comisiones prendidas: 🎚️ hoy apagadas, data.comprobantes = false).
// 🔒 Nunca muestra plata (el servidor ni la manda): este link lo pueden abrir
//    también los chicos de la oficina.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiCamera, HiChatAlt2, HiCheck, HiDocumentText, HiLockClosed } from "react-icons/hi";

import { subirArchivo } from "../services/gestoria";
import { Avatar } from "../components/gestoria/Piezas";
import { ESTADOS, PASOS, ddmm, fechaCorta, linkWhatsApp } from "../components/gestoria/gestoriaUtils";

const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}/api/` : "/api/")
).replace(/\/api\/?$/, "");

const COLORES = {
  RECIBIDO: "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark",
  ASIGNADO: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-duo-azul/40 text-duo-azul",
  EN_REGISTRO: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
  OBSERVADO: "bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300",
  LISTO: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-duo-verde/40 text-duo-verde-sombra dark:text-duo-verde",
  ENTREGADO: "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark",
  CANCELADO: "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark",
};

function detalleEstado(d) {
  switch (d.estado) {
    case "RECIBIDO":
      return "Ya tenemos tus papeles. En breve lo toma un gestor.";
    case "ASIGNADO":
      return "El gestor ya tiene tus papeles y lo va a presentar en el registro.";
    case "EN_REGISTRO":
      return d.fecha_estimada ? `Está en el registro. Calculamos que va a estar listo el ${fechaCorta(d.fecha_estimada)}.` : "Está en el registro.";
    case "OBSERVADO":
      return "El registro pidió algo más. Nosotros nos ocupamos; si necesitamos algo tuyo, te escribimos.";
    case "LISTO":
      return `¡Ya está! Pasá a retirarlo por THAMES ${d.oficina?.nombre || ""}.`.replace(" .", ".");
    case "ENTREGADO":
      return "Ya lo retiraste. ¡Gracias por confiar en THAMES!";
    case "CANCELADO":
      return "Este trámite se canceló. Cualquier duda, escribinos.";
    default:
      return "";
  }
}

export default function MiTramitePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState(null); // {ok, texto}
  const [subiendo, setSubiendo] = useState("");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/public/gestoria/${token}/`);
      if (!res.ok) throw new Error("no");
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subir = async (file, tipo) => {
    if (!file) return;
    setSubiendo(tipo);
    setAviso(null);
    try {
      const arch = await subirArchivo(file, "gestoria/clientes");
      const res = await fetch(`${API_ORIGIN}/public/gestoria/${token}/archivos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...arch, tipo }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || "No se pudo subir. Probá de nuevo.");
      await cargar(); // así la lista "Recibimos: …" ya aparece con el archivo nuevo
      setAviso({ ok: true, texto: j.mensaje || "¡Gracias! Lo recibimos." });
    } catch (e) {
      setAviso({ ok: false, texto: e?.message || "No se pudo subir. Probá de nuevo." });
    } finally {
      setSubiendo("");
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface-dark">
        <div className="w-6 h-6 border-2 border-duo-violeta/25 border-t-duo-violeta rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface dark:bg-surface-dark px-6 text-center">
        <HiLockClosed className="w-7 h-7 text-suave dark:text-suave-dark" />
        <p className="font-semibold text-titulo dark:text-titulo-dark">Link inválido o vencido</p>
        <p className="text-[13px] text-suave dark:text-suave-dark">Pedile a la oficina que te pase el link actualizado.</p>
      </div>
    );
  }

  const idx = PASOS.indexOf(data.estado === "OBSERVADO" ? "EN_REGISTRO" : data.estado);
  const cerrado = data.estado === "ENTREGADO" || data.estado === "CANCELADO";
  const wa = linkWhatsApp(data.oficina?.whatsapp, `¡Hola! Te escribo por mi trámite ${data.numero}${data.patente ? ` (${data.patente})` : ""}.`);
  const conComprobante = data.comprobantes !== false; // 🎚️ apagado con las comisiones

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      <div className="max-w-[480px] mx-auto">
        <header className="flex items-center justify-between bg-slate-900 px-4 py-4 text-white">
          <b className="tracking-[0.08em]">
            THAMES <span className="text-red-300">SEGUROS</span>
          </b>
          <span className="text-[13px] text-slate-300">Seguimiento de trámite</span>
        </header>

        <div className="flex flex-col gap-4 px-4 pt-5 pb-10">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] text-suave dark:text-suave-dark">Hola{data.nombre ? `, ${data.nombre}` : ""}</span>
            <h1 className="text-[22px] font-bold leading-tight text-titulo dark:text-titulo-dark">
              Tu trámite de {String(data.tipo_txt || "").toLowerCase()}
              {data.vehiculo || data.patente ? (
                <>
                  {" "}· {data.vehiculo} <span className="font-mono">{data.patente}</span>
                </>
              ) : null}
            </h1>
          </div>

          <div className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${COLORES[data.estado] || COLORES.RECIBIDO}`}>
            <span className="text-[12px] font-bold tracking-wide">CÓMO VA</span>
            <strong className="text-2xl">{data.estado_cliente}</strong>
            <span className="text-[14px]">{detalleEstado(data)}</span>
          </div>

          {data.gestor_nombre && data.estado !== "CANCELADO" && (
            <div className="flex items-center gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3">
              <Avatar nombre={data.gestor_nombre} foto={data.gestor_foto} size={44} color="#6d28d9" />
              <span className="flex flex-col min-w-0">
                <span className="text-[12px] text-suave dark:text-suave-dark">
                  {data.estado === "ENTREGADO" ? "Tu trámite lo hizo" : "Tu trámite lo hace"}
                </span>
                <strong className="text-[15px] text-titulo dark:text-titulo-dark truncate">{data.gestor_nombre}</strong>
              </span>
            </div>
          )}

          <ol className="rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-1.5" aria-label="Pasos del trámite">
            {PASOS.map((p, i) => {
              const hecho = data.estado === "ENTREGADO" ? i <= idx : i < idx;
              const actual = i === idx && !cerrado;
              const obs = actual && data.estado === "OBSERVADO";
              const fecha = data.fechas?.[p];
              const sub = fecha ? ddmm(fecha) : p === "LISTO" && data.aviso_whatsapp !== false ? "Te avisamos por WhatsApp" : "";
              const bola = hecho
                ? "bg-duo-verde text-white"
                : obs
                  ? "bg-orange-500 text-white"
                  : actual
                    ? "bg-duo-violeta text-white"
                    : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark";
              return (
                <li key={p} className="flex gap-3 border-b border-linea/70 dark:border-linea-dark/70 py-3 last:border-b-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${bola}`}>
                    {hecho ? <HiCheck className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <strong className={`text-[14px] ${hecho || actual ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>
                      {obs ? ESTADOS.OBSERVADO.cli : ESTADOS[p].cli}
                    </strong>
                    {sub && <span className="text-[13px] text-suave dark:text-suave-dark">{sub}</span>}
                  </span>
                </li>
              );
            })}
          </ol>

          <section className="flex flex-col gap-2 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Novedades</h2>
            {(data.novedades || []).length ? (
              data.novedades.map((n, i) => (
                <div key={i} className="flex flex-col gap-0.5 border-t border-linea/70 dark:border-linea-dark/70 pt-2.5 first:border-t-0 first:pt-0">
                  <span className="text-[12px] text-suave dark:text-suave-dark">{ddmm(n.fecha)}</span>
                  <span className="text-[14px] text-titulo dark:text-titulo-dark">{n.texto}</span>
                </div>
              ))
            ) : (
              <span className="text-[14px] text-suave dark:text-suave-dark">Todavía no hay novedades.</span>
            )}
          </section>

          {data.puede_subir && (
            <section className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
              <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Mandanos fotos o papeles</h2>
              {data.estado === "OBSERVADO" && data.falta ? (
                <p className="rounded-lg bg-orange-50 dark:bg-orange-500/10 px-3 py-2 text-[14px] text-orange-700 dark:text-orange-300">
                  El registro pidió: <strong>{data.falta}</strong>. Si lo tenés, sacale una foto y subila acá.
                </p>
              ) : (
                <span className="text-[13px] text-suave dark:text-suave-dark">Si te piden algo (DNI, cédula, 08…), sacale una foto y subila acá. No hace falta ir a la oficina.</span>
              )}
              {aviso && (
                <p
                  role="status"
                  className={`rounded-lg px-3 py-2 text-[14px] font-semibold ${
                    aviso.ok
                      ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                      : "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                  }`}
                >
                  {aviso.texto}
                </p>
              )}
              <div className="grid grid-cols-1 gap-2">
                <label className={`inline-flex items-center justify-center gap-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3 text-[15px] font-semibold text-titulo dark:text-titulo-dark cursor-pointer ${subiendo ? "opacity-60 pointer-events-none" : ""}`}>
                  <HiCamera className="w-5 h-5" />
                  {subiendo === "papel" ? "Subiendo…" : "Subir foto o PDF"}
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; subir(f, "papel"); }} />
                </label>
                {conComprobante && (
                  <label className={`inline-flex items-center justify-center gap-2 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3 text-[15px] font-semibold text-titulo dark:text-titulo-dark cursor-pointer ${subiendo ? "opacity-60 pointer-events-none" : ""}`}>
                    <HiDocumentText className="w-5 h-5" />
                    {subiendo === "comprobante" ? "Subiendo…" : "Subir comprobante de pago"}
                    <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; subir(f, "comprobante"); }} />
                  </label>
                )}
              </div>
              {conComprobante && (
                <span className="text-[12px] text-suave dark:text-suave-dark">El comprobante es de lo que le pagaste a la gestoría. Queda guardado en privado.</span>
              )}
              {(data.archivos || []).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {data.archivos.map((x, i) => (
                    <span key={i} className="flex items-center gap-2 rounded-lg bg-surface dark:bg-surface-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark">
                      <HiCheck className="w-4 h-4 text-duo-verde shrink-0" />
                      <span className="flex-1 min-w-0 truncate">Recibimos: {x.nombre}</span>
                      <span className="text-[11px] text-suave dark:text-suave-dark whitespace-nowrap">
                        {x.tipo === "comprobante" ? "comprobante" : "foto o papel"} · {ddmm(x.fecha)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {!cerrado && (
            <section className="flex flex-col gap-1.5 rounded-2xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4 text-[14px] text-duo-amarillo-sombra dark:text-duo-amarillo">
              <h2 className="text-[15px] font-semibold">Para retirarlo</h2>
              <span>El pago del trámite se lo hacés directo a la gestoría{data.gestor_nombre ? ` (${data.gestor_nombre})` : ""}.</span>
              <span>
                Lo retirás en THAMES {data.oficina?.nombre}
                {data.oficina?.direccion ? ` · ${data.oficina.direccion}` : ""}
              </span>
            </section>
          )}

          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-4 text-[16px] font-semibold text-white"
            >
              <HiChatAlt2 className="w-5 h-5" /> Escribinos por WhatsApp
            </a>
          )}
          <p className="text-center text-[13px] text-suave dark:text-suave-dark">Este link es solo para vos. No lo compartas.</p>
        </div>
      </div>
    </div>
  );
}
