// src/pages/MiCasoPage.jsx
//
// 📁 "MI CASO" — página pública, sin login. El cliente entra con el link que
// le manda la oficina por WhatsApp: /#/mi-caso/<token>
//
// Ve cómo va su caso en palabras simples: los 7 pasos, su abogado (foto y
// nombre), su próximo turno, las fechas importantes y las novedades. Si le
// pidieron un papel, lo sube desde acá (foto o PDF).
// 🔒 Nunca ve plata, notas internas ni el teléfono del abogado (el servidor ni
//    los manda): el contacto es la oficina.
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { HiCalendar, HiCamera, HiChatAlt2, HiCheck, HiLockClosed, HiPhone } from "react-icons/hi";

import { subirArchivo } from "../services/legales";
import { AvatarAbogado, CajaFecha } from "../components/legales/PiezasLegales";
import { ddmm, diaCorto, diaLargo, linkWhatsApp, textoFalta, ymdDeIso } from "../components/legales/legalesUtils";

const API_ORIGIN = String(
  import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}/api/` : "/api/")
).replace(/\/api\/?$/, "");

export default function MiCasoPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  // "link" = el link no existe o lo cambiaron (404) · "red" = no hay señal o el
  // servidor no respondió (se puede reintentar) · "" = todo bien.
  const [error, setError] = useState("");
  const hayDatos = useRef(false);
  const [papel, setPapel] = useState(""); // para qué papel es la foto que sube
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null); // {ok, texto}

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/public/legales/${token}/`);
      if (res.status === 404) {
        setError("link");
        return;
      }
      if (!res.ok) throw new Error("servidor");
      setData(await res.json());
      hayDatos.current = true;
      setError("");
    } catch {
      // Si ya se estaba viendo el caso, queda como estaba (ej: se cortó la
      // señal justo después de subir una foto). Si no, se ofrece reintentar.
      if (!hayDatos.current) setError("red");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subir = async (file) => {
    if (!file) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const arch = await subirArchivo(file, "legales/clientes");
      const res = await fetch(`${API_ORIGIN}/public/legales/${token}/archivos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...arch, papel }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || "No se pudo subir. Probá de nuevo.");
      await cargar();
      setPapel("");
      setAviso({ ok: true, texto: j.mensaje || "¡Gracias! Ya lo recibimos." });
    } catch (e) {
      setAviso({ ok: false, texto: e?.message || "No se pudo subir. Probá de nuevo." });
    } finally {
      setSubiendo(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface-dark">
        <div className="w-6 h-6 border-2 border-sky-700/25 border-t-sky-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "red" && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface dark:bg-surface-dark px-6 text-center">
        <p className="font-semibold text-titulo dark:text-titulo-dark">No pudimos abrir tu caso ahora</p>
        <p className="text-[13px] text-suave dark:text-suave-dark">Revisá tu conexión y probá de nuevo.</p>
        <button
          type="button"
          onClick={() => {
            setCargando(true);
            cargar();
          }}
          className="mt-1 rounded-xl bg-sky-700 px-5 py-3 text-[15px] font-bold text-white"
        >
          Probar de nuevo
        </button>
      </div>
    );
  }

  if (error === "link" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface dark:bg-surface-dark px-6 text-center">
        <HiLockClosed className="w-7 h-7 text-suave dark:text-suave-dark" />
        <p className="font-semibold text-titulo dark:text-titulo-dark">Link inválido o vencido</p>
        <p className="text-[13px] text-suave dark:text-suave-dark">Pedí que te pasen el link actualizado.</p>
      </div>
    );
  }

  const actual = (data.pasos || []).find((p) => p.actual);
  const turno = data.proximo_turno;
  const ofi = data.oficina || {};
  const wa = linkWhatsApp(ofi.whatsapp, `¡Hola! Soy ${data.nombre || "cliente"}, te escribo por mi caso ${data.numero}.`);
  const telOfi = String(ofi.whatsapp || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      <div className="max-w-[480px] mx-auto">
        <header className="flex items-center justify-between bg-slate-900 px-4 py-4 text-white">
          <b className="tracking-[0.08em]">
            THAMES <span className="text-red-300">SEGUROS</span>
          </b>
          <span className="text-[13px] text-slate-300">Tu caso</span>
        </header>

        <div className="flex flex-col gap-4 px-4 pt-5 pb-10">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-suave dark:text-suave-dark">
              {data.numero} · {data.tema_nombre}
            </span>
            <h1 className="text-[26px] font-bold leading-tight text-titulo dark:text-titulo-dark">Hola{data.nombre ? `, ${data.nombre}` : ""}</h1>
          </div>

          <section className="flex flex-col gap-1.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-4">
            <span className="text-[12px] font-bold tracking-wide text-indigo-700 dark:text-indigo-300">CÓMO VA</span>
            <strong className="text-[22px] leading-tight text-indigo-900 dark:text-indigo-100">{data.estado_cliente}</strong>
            {actual?.fecha && data.abierto && <span className="text-[13px] text-indigo-700 dark:text-indigo-300">desde el {diaLargo(ymdDeIso(actual.fecha))}</span>}
            {data.estado_texto && <span className="text-[14px] text-titulo dark:text-titulo-dark">{data.estado_texto}</span>}
          </section>

          {turno && (
            <section className="flex flex-col gap-2 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-sky-800 dark:text-sky-300">
                <HiCalendar className="w-4 h-4" /> {turno.hoy ? "TU TURNO ES HOY" : "TU TURNO"}
              </span>
              {turno.modalidad === "TELEFONO" ? (
                <p className="text-[15px] text-titulo dark:text-titulo-dark">
                  <b>
                    {turno.hoy ? "Hoy" : diaLargo(turno.fecha)} a las {turno.hora}
                  </b>{" "}
                  te llama {turno.abogado_nombre} por teléfono. Tené a mano tu DNI.
                </p>
              ) : (
                <p className="text-[15px] text-titulo dark:text-titulo-dark">
                  <b>
                    {turno.hoy ? "Hoy" : diaLargo(turno.fecha)} a las {turno.hora}
                  </b>{" "}
                  con {turno.abogado_nombre}, en THAMES {turno.oficina_nombre}
                  {turno.oficina_direccion ? ` (${turno.oficina_direccion})` : ""}. Traé tu DNI.
                </p>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3">
            <h2 className="pb-1 text-[15px] font-semibold text-titulo dark:text-titulo-dark">Los pasos</h2>
            <ol aria-label="Pasos del caso">
              {(data.pasos || []).map((p, i) => {
                const bola = p.hecho
                  ? "bg-duo-verde text-white"
                  : p.actual
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20"
                    : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark";
                return (
                  <li key={p.id} className="flex gap-3 py-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${bola}`}>
                      {p.hecho ? <HiCheck className="w-4 h-4" /> : i + 1}
                    </span>
                    <span className="flex flex-col">
                      <strong
                        className={`text-[14px] ${
                          p.actual ? "text-indigo-700 dark:text-indigo-300" : p.hecho ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"
                        }`}
                      >
                        {p.nombre}
                      </strong>
                      <span className="text-[12px] text-suave dark:text-suave-dark">
                        {p.actual && p.fecha ? `desde ${diaCorto(ymdDeIso(p.fecha))} · estás acá` : p.hecho && p.fecha ? diaCorto(ymdDeIso(p.fecha)) : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {data.abogado && (
            <section className="flex items-center gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3">
              <AvatarAbogado id={1} nombre={data.abogado.nombre} foto={data.abogado.foto_url} size={52} />
              <span className="flex flex-col min-w-0">
                <span className="text-[12px] text-suave dark:text-suave-dark">Tu abogado</span>
                <strong className="text-[16px] text-titulo dark:text-titulo-dark truncate">{data.abogado.nombre}</strong>
              </span>
            </section>
          )}

          {(data.fechas || []).length > 0 && (
            <section className="flex flex-col gap-2 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
              <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Próximas fechas</h2>
              {data.fechas.map((f, i) => {
                const cerca = f.dias <= 7;
                return (
                  <div
                    key={`${f.fecha}-${i}`}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                      cerca ? "border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]" : "border-linea dark:border-linea-dark"
                    }`}
                  >
                    <CajaFecha ymd={f.fecha} tono={cerca ? "ambar" : "neutro"} />
                    <span className="flex flex-col min-w-0">
                      <strong className="text-[15px] text-titulo dark:text-titulo-dark">{f.titulo}</strong>
                      <span className={`text-[13px] ${cerca ? "font-semibold text-amber-800 dark:text-amber-300" : "text-suave dark:text-suave-dark"}`}>
                        {f.hora ? `${f.hora} · ` : ""}
                        {textoFalta(f.dias)}
                      </span>
                      {f.detalle && <span className="text-[13px] text-titulo dark:text-titulo-dark">{f.detalle}</span>}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          <section className="flex flex-col gap-2 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Novedades</h2>
            {(data.novedades || []).length ? (
              data.novedades.map((n, i) => (
                <div key={i} className="flex flex-col gap-0.5 border-t border-linea/70 dark:border-linea-dark/70 pt-2.5 first:border-t-0 first:pt-0">
                  <span className="text-[12px] text-suave dark:text-suave-dark">{diaCorto(ymdDeIso(n.fecha))}</span>
                  <span className="text-[14px] text-titulo dark:text-titulo-dark [overflow-wrap:anywhere]">{n.texto}</span>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-suave dark:text-suave-dark">Todavía no hay novedades. Cuando las haya, las vas a ver acá.</p>
            )}
          </section>

          {data.puede_subir && (
            <section className="flex flex-col gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/70 dark:bg-sky-500/5 p-4">
              <h2 className="text-[16px] font-bold text-sky-900 dark:text-sky-200">¿Te pidieron un papel?</h2>
              <p className="text-[13px] text-titulo dark:text-titulo-dark">
                Sacale una foto o subí el PDF acá. No hace falta ir a la oficina.
              </p>
              {(data.papeles_faltan || []).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">Te faltan (tocá cuál vas a subir):</span>
                  <div className="flex flex-wrap gap-2">
                    {data.papeles_faltan.map((p) => (
                      <button
                        key={p.key || p.nombre}
                        type="button"
                        aria-pressed={papel === p.key}
                        onClick={() => setPapel(papel === p.key ? "" : p.key)}
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                          papel === p.key ? "border-sky-700 bg-sky-700 text-white" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark"
                        }`}
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className={`inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3.5 text-[16px] font-bold text-white cursor-pointer ${subiendo ? "opacity-60 pointer-events-none" : ""}`}>
                <HiCamera className="w-5 h-5" />
                {subiendo ? "Subiendo…" : "Subir foto o PDF"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  disabled={subiendo}
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    ev.target.value = "";
                    subir(f);
                  }}
                />
              </label>
              {aviso && (
                <p className={`text-[13px] font-semibold ${aviso.ok ? "text-duo-verde-sombra dark:text-duo-verde" : "text-duo-rojo"}`} role="status">
                  {aviso.texto}
                </p>
              )}
              {(data.archivos || []).length > 0 && (
                <ul className="flex flex-col gap-1 text-[13px] text-titulo dark:text-titulo-dark">
                  {data.archivos.slice(0, 6).map((a, i) => (
                    <li key={`${a.nombre}-${i}`} className="flex items-center gap-1.5">
                      <HiCheck className="w-4 h-4 text-duo-verde shrink-0" /> Ya subiste: {a.nombre} · {ddmm(a.fecha)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 px-4 py-4 text-[16px] font-bold text-white"
            >
              <HiChatAlt2 className="w-5 h-5" /> ¿Dudas? Escribinos por WhatsApp
            </a>
          ) : telOfi ? (
            <a href={`tel:${telOfi}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-4 text-[16px] font-bold text-white">
              <HiPhone className="w-5 h-5" /> Llamanos
            </a>
          ) : null}
          <p className="text-center text-[12px] text-suave dark:text-suave-dark">
            {data.propio
              ? data.abogado?.nombre
                ? `Tu abogado: ${data.abogado.nombre}`
                : ""
              : `THAMES ${ofi.nombre || ""} · tu oficina${ofi.direccion ? ` · ${ofi.direccion}` : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}
