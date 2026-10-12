// src/components/renovaciones/PropuestasCompania.jsx
// ============================================================
// 🔁 "La Equidad / AMCA emitió el período que sigue" — listo para aprobar.
//
// La tarea de las 8:30 detecta el período nuevo en La Equidad o en AMCA, baja
// el PDF y los cupones (fecha, importe, imagen y código) y lo deja preparado
// en la póliza. Acá se ve una tarjeta por póliza: "Renovar" crea la póliza nueva con
// esos cupones (la vieja queda finalizada con sus pagos); "Descartar" la saca
// de la lista con el motivo.
//
// Estilo: "aprobar un pago" de Mercado Pago (una tarjeta, un botón principal),
// con los colores de THAMES. Si no hay nada para aprobar, no se muestra.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  HiRefresh, HiCheck, HiExclamation, HiArrowRight, HiDocumentText,
} from "react-icons/hi";
import Boton3D from "../ui/Boton3D";
import useDatosVivos from "../../hooks/useDatosVivos";
import {
  MOTIVOS_DESCARTE, listarPropuestas, aplicarPropuesta, descartarPropuesta, reabrirPropuesta, textoError,
} from "../../services/renovacionesCompania";

const ddmm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");
const ddmmaa = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
// Nombre corto de la compañía de cada tarjeta ("La Equidad", "AMCA").
const ciaDe = (it) => {
  const c = String(it?.propuesta?.compania || it?.compania || "").trim();
  if (/amca|ant[aá]rtida/i.test(c)) return "AMCA";
  if (/equidad/i.test(c)) return "La Equidad";
  return c || "La compañía";
};

const pesos = (n, dec = 0) =>
  n == null ? "—" : `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

function estadoActual(a) {
  if (!a) return { texto: "", tono: "suave" };
  if (a.debe > 0) return { texto: `Debe ${a.debe} cuota${a.debe === 1 ? "" : "s"}`, tono: "amarillo" };
  if (a.cuotas > 0 && a.pagas === a.cuotas) return { texto: "Todo pago", tono: "verde" };
  return { texto: "Al día", tono: "verde" };
}

const TONO = {
  verde: "text-duo-verde",
  amarillo: "text-duo-amarillo",
  suave: "text-suave dark:text-suave-dark",
};

function Chapa({ children, chica = false }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-md border-2 border-slate-900 bg-white font-mono font-semibold tracking-wider text-slate-900 ${
        chica ? "px-2 py-0.5 text-[13px]" : "px-2.5 py-1 text-[15px]"
      }`}
    >
      {children}
    </span>
  );
}

function Tarjeta({ it, abierto, onToggle, ocupado, onRenovar, onDescartar }) {
  const p = it.propuesta || {};
  const cia = ciaDe(it);
  const est = estadoActual(it.actual);
  const cupones = p.cupones || [];
  const total = cupones.reduce((s, c) => s + (Number(c.importe) || 0), 0);
  const pdf = p.documento_pdf?.url
    ? `${p.documento_pdf.url}${p.datos_extra?.pago?.cuponera_pagina ? `#page=${p.datos_extra.pago.cuponera_pagina}` : ""}`
    : "";
  const avisos = [...(p.avisos || [])];
  if (it.actual?.debe > 0) {
    avisos.push(
      `Del período actual debe ${it.actual.debe} cuota${it.actual.debe === 1 ? "" : "s"}. Si no se paga, ${cia} puede anular la póliza aunque la renueves acá.`
    );
  }
  const dias = it.actual?.dias_para_terminar;

  return (
    <article className="overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
        {/* Quién */}
        <div className="flex min-w-0 items-center gap-3">
          <Chapa>{it.patente}</Chapa>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-titulo dark:text-titulo-dark">{it.cliente?.nombre || "—"}</div>
            <div className="truncate text-[12px] text-suave dark:text-suave-dark">
              {it.oficina || "Sin oficina"} · {cia} · Póliza {p.poliza_compania || it.numero_poliza}
              {it.cobertura ? ` · ${it.cobertura}` : ""}
            </div>
          </div>
        </div>

        {/* Actual → nuevo */}
        <div className="flex items-center gap-2.5 text-[12px]">
          <div className="flex flex-col">
            <span className="text-suave dark:text-suave-dark">Período actual</span>
            <span className="font-semibold text-titulo dark:text-titulo-dark">
              {ddmm(it.actual?.desde)} → {ddmm(it.actual?.hasta)}
            </span>
            <span className={`font-semibold ${TONO[est.tono]}`}>{est.texto}</span>
          </div>
          <HiArrowRight className="shrink-0 text-lg text-suave dark:text-suave-dark" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-suave dark:text-suave-dark">Período nuevo</span>
            <span className="font-bold text-titulo dark:text-titulo-dark">
              {ddmm(p.inicio)} → {ddmm(p.fin)}
            </span>
            {dias != null && (
              <span className="text-suave dark:text-suave-dark">
                {dias > 0 ? `Termina el actual en ${dias} día${dias === 1 ? "" : "s"}` : dias === 0 ? "El actual termina hoy" : `El actual terminó hace ${-dias} día${dias === -1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </div>

        {/* Cupones */}
        <div className="flex flex-wrap gap-2">
          {cupones.map((c, i) => (
            <div
              key={c.vencimiento}
              className="min-w-[92px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2.5 py-1.5"
            >
              <div className="text-[11px] text-suave dark:text-suave-dark">
                Cuota {i + 1} · {ddmm(c.vencimiento)}
                {c.pagada ? " · paga" : ""}
              </div>
              <div className="text-[15px] font-bold tabular-nums text-titulo dark:text-titulo-dark">{pesos(c.importe)}</div>
            </div>
          ))}
        </div>
      </div>

      {avisos.length > 0 && (
        <div className="mx-4 mb-3 space-y-1.5">
          {avisos.map((a) => (
            <div
              key={a}
              className="flex items-start gap-2 rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[12px] font-semibold text-duo-amarillo-sombra dark:text-amber-300"
            >
              <HiExclamation className="mt-0.5 shrink-0 text-base" aria-hidden="true" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {abierto && (
        <div className="grid gap-3 border-t border-linea dark:border-linea-dark p-4 sm:grid-cols-2 lg:grid-cols-4">
          {cupones.map((c, i) => (
            <figure key={c.vencimiento} className="m-0 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900">
              <div className="flex justify-between text-[12px] font-bold">
                <span>Cuota {i + 1} de {cupones.length}</span>
                <span>{pesos(c.importe, 2)}</span>
              </div>
              <div className="text-[12px]">Vence {ddmmaa(c.vencimiento)}{c.pagada ? " · ya paga" : ""}</div>
              {c.imagen_url ? (
                <img src={c.imagen_url} alt={`Cupón ${i + 1} de ${it.patente}`} loading="lazy" className="w-full rounded-md border border-slate-200" />
              ) : (
                <div className="rounded-md bg-slate-100 px-2 py-3 text-center text-[11px] text-slate-600">
                  {c.pagada ? `Ya paga: ${cia} no imprime el cupón` : "Sin imagen del cupón"}
                </div>
              )}
              {c.codigo_barras && (
                <figcaption className="break-all font-mono text-[10px] text-slate-600">{c.codigo_barras}</figcaption>
              )}
              {c.nota && <div className="text-[11px] text-slate-600">{c.nota}</div>}
            </figure>
          ))}
          <div className="flex flex-col justify-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
            <span>
              Total del período: <strong className="text-titulo dark:text-titulo-dark">{pesos(total, 2)}</strong>
            </span>
            {p.datos_extra?.pago?.codigo_link && (
              <span>
                Pago Mis Cuentas / Mercado Pago:{" "}
                <strong className="font-mono text-titulo dark:text-titulo-dark">{p.datos_extra.pago.codigo_link}</strong>
              </span>
            )}
            {pdf && (
              <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-duo-violeta">
                <HiDocumentText aria-hidden="true" /> Abrir el PDF de {cia}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linea dark:border-linea-dark px-4 py-3">
        <span className="text-[12px] text-suave dark:text-suave-dark">
          Lo dejó listo la tarea del {ddmm((p.creada_en || "").slice(0, 10))} · La póliza vieja queda «finalizada» con sus pagos
        </span>
        {it.puede ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDescartar}
              disabled={ocupado}
              className="min-h-[40px] rounded-xl border border-linea dark:border-linea-dark px-3.5 text-[13px] font-semibold text-suave dark:text-suave-dark transition active:scale-95 disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={abierto}
              className="min-h-[40px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark transition active:scale-95"
            >
              {abierto ? "Ocultar cupones" : "Ver cupones"}
            </button>
            <Boton3D variant="violeta" size="sm" onClick={onRenovar} disabled={ocupado}>
              {ocupado ? <HiRefresh className="animate-spin" aria-hidden="true" /> : null}
              {ocupado ? "Renovando…" : "Renovar"}
            </Boton3D>
          </div>
        ) : (
          <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">
            🔒 La renueva {it.oficina || "su oficina"} (o el admin)
          </span>
        )}
      </div>
    </article>
  );
}

function Descarte({ it, motivo, setMotivo, detalle, setDetalle, onVolver, onConfirmar, ocupado }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
      <div className="flex items-center gap-2 text-[15px] font-bold text-titulo dark:text-titulo-dark">
        <Chapa chica>{it.patente}</Chapa> ¿Por qué no la renovamos?
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Motivo">
        {MOTIVOS_DESCARTE.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={motivo === m.id}
            onClick={() => setMotivo(m.id)}
            className={`min-h-[40px] rounded-full border px-4 text-[13px] font-semibold transition active:scale-95 ${
              motivo === m.id
                ? "border-duo-violeta bg-duo-violeta text-white"
                : "border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
            }`}
          >
            {m.texto}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-[12px] text-suave dark:text-suave-dark">
        Aclaración (opcional)
        <input
          value={detalle}
          onChange={(e) => setDetalle(e.target.value.slice(0, 300))}
          placeholder="Ej: vendió el auto"
          className="min-h-[40px] rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 text-[14px] text-titulo dark:text-titulo-dark"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="min-h-[40px] rounded-xl border border-linea dark:border-linea-dark px-3.5 text-[13px] font-semibold text-suave dark:text-suave-dark"
        >
          Volver
        </button>
        <Boton3D variant="rojo" size="sm" onClick={onConfirmar} disabled={ocupado}>
          Descartar renovación
        </Boton3D>
      </div>
    </div>
  );
}

export default function PropuestasCompania({ oficina = "", onCambio }) {
  const [items, setItems] = useState([]);
  const [resueltas, setResueltas] = useState([]); // [{it, tipo: "ok"|"desc", nuevaId, numero, motivoTexto}]
  const [abierto, setAbierto] = useState(null);
  const [descartando, setDescartando] = useState(null);
  const [motivo, setMotivo] = useState("no_renueva");
  const [detalle, setDetalle] = useState("");
  const [ocupado, setOcupado] = useState(null); // id o "todas"

  const cargar = useCallback(async () => {
    try {
      setItems(await listarPropuestas(oficina));
    } catch {
      /* si falla, no tapamos la pantalla: la bandeja de siempre sigue andando */
    }
  }, [oficina]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["polizas"], cargar);

  const resueltasIds = useMemo(() => new Set(resueltas.map((r) => r.it.id)), [resueltas]);
  const pendientes = useMemo(() => items.filter((i) => !resueltasIds.has(i.id)), [items, resueltasIds]);
  const renovables = pendientes.filter((i) => i.puede);
  // "La Equidad emitió…", "AMCA emitió…" o "La Equidad y AMCA emitieron…"
  const cias = useMemo(() => [...new Set(pendientes.map(ciaDe))], [pendientes]);
  const quienes = cias.length ? cias.join(" y ") : "La compañía";

  const renovarUna = useCallback(async (it) => {
    const r = await aplicarPropuesta(it.id);
    setResueltas((prev) => [...prev, { it, tipo: "ok", nuevaId: r?.nueva_id, numero: r?.numero_poliza }]);
    return r;
  }, []);

  const renovar = async (it) => {
    setOcupado(it.id);
    try {
      await renovarUna(it);
      toast.success(`${it.patente} renovada`);
      onCambio?.();
    } catch (e) {
      toast.error(textoError(e, `No se pudo renovar ${it.patente}.`));
      cargar();
    } finally {
      setOcupado(null);
      setAbierto(null);
    }
  };

  const renovarTodas = async () => {
    setOcupado("todas");
    let ok = 0;
    for (const it of renovables) {
      try {
        await renovarUna(it);
        ok += 1;
      } catch (e) {
        toast.error(textoError(e, `No se pudo renovar ${it.patente}.`));
      }
    }
    if (ok) toast.success(`${ok} renovada${ok === 1 ? "" : "s"}`);
    setOcupado(null);
    setAbierto(null);
    onCambio?.();
    cargar();
  };

  const confirmarDescarte = async () => {
    const it = pendientes.find((i) => i.id === descartando);
    if (!it) return;
    setOcupado(it.id);
    try {
      const r = await descartarPropuesta(it.id, motivo, detalle.trim());
      setResueltas((prev) => [...prev, { it, tipo: "desc", motivoTexto: r?.propuesta?.motivo_texto || "" }]);
      setDescartando(null);
      setDetalle("");
    } catch (e) {
      toast.error(textoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const deshacer = async (it) => {
    setOcupado(it.id);
    try {
      await reabrirPropuesta(it.id);
      setResueltas((prev) => prev.filter((r) => r.it.id !== it.id));
      await cargar();
    } catch (e) {
      toast.error(textoError(e));
    } finally {
      setOcupado(null);
    }
  };

  if (!pendientes.length && !resueltas.length) return null;

  return (
    <section
      aria-labelledby="prop-cia-titulo"
      className="mb-5 flex flex-col gap-4 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta"
          >
            <HiRefresh className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 id="prop-cia-titulo" className="text-[17px] font-bold text-titulo dark:text-titulo-dark">
              {quienes} {cias.length > 1 ? "emitieron" : "emitió"} el período que sigue
            </h2>
            <p className="mt-0.5 max-w-2xl text-[13px] text-suave dark:text-suave-dark">
              La tarea de las 8:30 ya bajó el PDF y los cupones de cada una. Revisá y tocá{" "}
              <strong className="text-titulo dark:text-titulo-dark">Renovar</strong>: Thames arma la póliza nueva con las
              mismas fechas e importes que la compañía.
            </p>
          </div>
        </div>
        {renovables.length > 1 && (
          <Boton3D variant="violeta" size="sm" onClick={renovarTodas} disabled={!!ocupado}>
            {ocupado === "todas" ? <HiRefresh className="animate-spin" aria-hidden="true" /> : null}
            Renovar las {renovables.length}
          </Boton3D>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {pendientes.map((it) =>
          descartando === it.id ? (
            <Descarte
              key={it.id}
              it={it}
              motivo={motivo}
              setMotivo={setMotivo}
              detalle={detalle}
              setDetalle={setDetalle}
              onVolver={() => setDescartando(null)}
              onConfirmar={confirmarDescarte}
              ocupado={ocupado === it.id}
            />
          ) : (
            <Tarjeta
              key={it.id}
              it={it}
              abierto={abierto === it.id}
              onToggle={() => setAbierto(abierto === it.id ? null : it.id)}
              ocupado={ocupado === it.id || ocupado === "todas"}
              onRenovar={() => renovar(it)}
              onDescartar={() => {
                setDescartando(it.id);
                setMotivo("no_renueva");
                setDetalle("");
                setAbierto(null);
              }}
            />
          )
        )}

        {resueltas.map((r) =>
          r.tipo === "ok" ? (
            <div
              key={`ok-${r.it.id}`}
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-4 py-3"
            >
              <span className="flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark">
                <HiCheck className="shrink-0 text-lg text-duo-verde" aria-hidden="true" />
                <span>
                  <strong>{r.it.patente}</strong> renovada · póliza {r.numero || r.it.propuesta?.poliza_compania} del{" "}
                  {ddmm(r.it.propuesta?.inicio)} al {ddmm(r.it.propuesta?.fin)}
                </span>
              </span>
              {r.nuevaId && (
                <a href={`#/polizas/${r.nuevaId}`} className="text-[13px] font-bold text-duo-violeta">
                  Ver póliza nueva
                </a>
              )}
            </div>
          ) : (
            <div
              key={`desc-${r.it.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-linea dark:border-linea-dark px-4 py-2.5 text-[13px] text-suave dark:text-suave-dark"
            >
              <span>
                <strong className="text-titulo dark:text-titulo-dark">{r.it.patente}</strong> · descartada
                {r.motivoTexto ? `: ${r.motivoTexto}` : ""}
              </span>
              <button
                type="button"
                onClick={() => deshacer(r.it)}
                disabled={ocupado === r.it.id}
                className="min-h-[40px] rounded-xl border border-linea dark:border-linea-dark px-3.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark disabled:opacity-50"
              >
                Deshacer
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}
