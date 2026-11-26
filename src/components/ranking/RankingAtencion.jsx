/* src/components/ranking/RankingAtencion.jsx
 *
 * ⭐ RANKING «MEJOR ATENCIÓN» (25/11/2026) — la 3ª pestaña de /ranking.
 *    Lo que dicen los CLIENTES: promedio de estrellas de cada empleado en el mes.
 *    Las estrellas llegan por el link que se manda después de cobrar o por el QR de la oficina.
 *
 *    Reglas (opiniones/servicios.py):
 *      · Para entrar al podio hacen falta 5 opiniones en el mes (así 1 sola de 5★ no gana).
 *      · Orden: promedio; si empatan, el que tiene más opiniones.
 *      · Lo ven todos. Los comentarios y las quejas, solo el admin (página «Atención»).
 *
 *    Abajo: «Pedir opinión» para el que asesoró a alguien sin cobrarle (arma el WhatsApp).
 *    `selector` = los botones Oficinas | Equipo | Atención que manda RankingPage.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChevronRight, HiExclamation, HiRefresh, HiStar } from "react-icons/hi";
import { LuMessageCircle } from "react-icons/lu";

import useDatosVivos from "../../hooks/useDatosVivos";
import { UI } from "../tareas/tareasUI";
import { PREMIO_TXT, pedirEmpleados, pedirLink, pedirRanking } from "../../services/opiniones";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const nombreMes = (m) => MESES[Number(String(m).split("-")[1]) - 1] || "";
const inicial = (n) => (n || "?").trim().charAt(0).toUpperCase();
const promedioTxt = (n) => Number(n || 0).toFixed(1).replace(".", ",");

const PODIO = [
  { anillo: "ring-[#f59e0b]", num: "bg-[#f59e0b] text-white" },
  { anillo: "ring-slate-300 dark:ring-slate-500", num: "bg-slate-400 text-white" },
  { anillo: "ring-[#fb923c]", num: "bg-[#c2410c] text-white" },
];

function Cara({ fila, tam = "h-12 w-12", anillo = "" }) {
  return (
    <span
      className={`relative grid flex-none place-items-center overflow-hidden rounded-full bg-marca/10 text-[17px] font-bold text-marca ring-2 ${anillo || "ring-transparent"} ${tam}`}
      aria-hidden="true"
    >
      {fila.foto ? <img src={fila.foto} alt="" className="h-full w-full object-cover" loading="lazy" /> : inicial(fila.nombre)}
    </span>
  );
}

function Estrellas({ valor }) {
  const llenas = Math.round(Number(valor || 0));
  return (
    <span className="inline-flex" aria-label={`${promedioTxt(valor)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <HiStar key={n} className={`h-4 w-4 ${n <= llenas ? "text-[#f59e0b]" : "text-linea dark:text-linea-dark"}`} />
      ))}
    </span>
  );
}

function PedirOpinion() {
  const [abierto, setAbierto] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [empleado, setEmpleado] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto || empleados.length) return;
    pedirEmpleados()
      .then((d) => setEmpleados(d?.resultados || []))
      .catch(() => {});
  }, [abierto, empleados.length]);

  const armar = async () => {
    setEnviando(true);
    try {
      const r = await pedirLink({ telefono, ...(empleado ? { empleado_id: Number(empleado) } : {}) });
      window.open(r.wa_url, "_blank", "noopener");
      setTelefono("");
      toast.success("Listo: mandale el mensaje por WhatsApp");
    } catch (e) {
      toast.error(e?.response?.data?.error || "No se pudo armar el link");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`${UI.card} mt-5 p-4`}>
      <button type="button" onClick={() => setAbierto((a) => !a)} className="flex w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#25D366]/15 text-[#16a34a]">
          <LuMessageCircle className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[14px] font-semibold ${UI.txtTitulo}`}>Pedir opinión</span>
          <span className={`block text-[12px] ${UI.txtSuave}`}>¿Asesoraste a alguien sin cobrarle? Mandale el link igual.</span>
        </span>
        <HiChevronRight className={`h-5 w-5 ${UI.txtSuave} transition-transform ${abierto ? "rotate-90" : ""}`} />
      </button>
      {abierto ? (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className={UI.input}
            inputMode="tel"
            placeholder="WhatsApp del cliente"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            aria-label="WhatsApp del cliente"
          />
          <select className={UI.input} value={empleado} onChange={(e) => setEmpleado(e.target.value)} aria-label="Quién lo atendió">
            <option value="">Lo elige el cliente</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.oficina ? ` · ${e.oficina}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={enviando || telefono.replace(/\D/g, "").length < 8}
            onClick={armar}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-[14px] font-bold text-[#06240F] disabled:opacity-40"
          >
            <LuMessageCircle className="h-4 w-4" /> WhatsApp
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function RankingAtencion({ selector = null }) {
  const hoy = useMemo(() => new Date(), []);
  const esteMes = mesDe(hoy);
  const mesPasado = mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  const [mes, setMes] = useState(esteMes);
  const [oficina, setOficina] = useState("");
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const pedidoRef = useRef(0);

  const cargar = async (opciones) => {
    const silencioso = !!opciones?.silencioso;
    const mio = ++pedidoRef.current;
    if (!silencioso) setLoading(true);
    try {
      const d = await pedirRanking({ mes, oficina });
      if (mio === pedidoRef.current) setDatos(d);
    } catch {
      if (!silencioso && mio === pedidoRef.current) toast.error("No se pudo cargar el ranking de atención");
    } finally {
      if (mio === pedidoRef.current) setLoading(false);
    }
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, oficina]);

  // 📡 EN VIVO: cada estrella nueva mueve la tabla sola.
  useDatosVivos(["opiniones", "quejas"], () => cargar({ silencioso: true }), { cadaMs: 30_000 });

  const filas = datos?.ranking || [];
  const enJuego = filas.filter((f) => f.entra);
  const enCamino = filas.filter((f) => !f.entra);
  const podio = enJuego.slice(0, 3);
  const resto = enJuego.slice(3);
  const minimo = datos?.minimo || 5;

  return (
    <div className={`${UI.screen} px-4 py-5`}>
      <div className="mx-auto max-w-lg">
        {selector}

        <div className="mb-1 flex items-center justify-between">
          <h1 className={`flex items-center gap-2 text-xl font-semibold ${UI.txtTitulo}`}>
            <HiStar className="text-[#f59e0b]" /> Mejor atención
          </h1>
          <button
            type="button"
            onClick={() => cargar()}
            aria-label="Actualizar"
            className="rounded-full border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2 text-suave dark:text-suave-dark transition-colors hover:bg-surface dark:hover:bg-surface-dark"
          >
            <HiRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className={`mb-4 text-[13px] ${UI.txtSuave}`}>
          Las estrellas que ponen los clientes · {PREMIO_TXT.toLowerCase()}
        </p>

        {datos?.es_admin && datos?.quejas_nuevas > 0 ? (
          <Link
            to="/atencion"
            className="mb-3 flex items-center gap-2 rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2.5 text-[13px] font-semibold text-duo-rojo"
          >
            <HiExclamation className="h-4 w-4 flex-none" />
            {datos.quejas_nuevas === 1 ? "1 queja nueva" : `${datos.quejas_nuevas} quejas nuevas`} de clientes
            <span className="ml-auto flex items-center gap-0.5">
              Ver <HiChevronRight className="h-4 w-4" />
            </span>
          </Link>
        ) : null}

        {/* Mes */}
        <div className="mb-3 flex gap-1.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1.5">
          {[
            [esteMes, `${nombreMes(esteMes)} · en juego`],
            [mesPasado, `${nombreMes(mesPasado)} · final`],
          ].map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mes === m}
              onClick={() => setMes(m)}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors first-letter:uppercase ${
                mes === m ? "bg-marca text-white" : UI.txtSuave
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Oficinas (promedio de cada una; tocá para filtrar) */}
        {datos?.oficinas?.length > 1 || oficina ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOficina("")}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                !oficina ? "border-marca bg-marca/10 text-marca" : `border-linea dark:border-linea-dark ${UI.txtSuave}`
              }`}
            >
              Todas
            </button>
            {(datos?.oficinas || []).map((o) => (
              <button
                key={o.oficina_id ?? "x"}
                type="button"
                onClick={() => setOficina(String(o.oficina_id || ""))}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                  String(oficina) === String(o.oficina_id)
                    ? "border-marca bg-marca/10 text-marca"
                    : `border-linea dark:border-linea-dark ${UI.txtSuave}`
                }`}
              >
                {o.oficina} · {promedioTxt(o.promedio)}★
              </button>
            ))}
          </div>
        ) : null}

        {loading && !datos ? (
          <div className="flex justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-marca" />
          </div>
        ) : filas.length === 0 ? (
          <div className={`${UI.card} p-6 text-center text-[14px] ${UI.txtSuave}`}>
            Todavía no hay opiniones en {nombreMes(mes)}.
            <br />
            Después de cobrar, tocá <b className={UI.txtTitulo}>«Pedile la opinión»</b> y mandale el link al cliente.
          </div>
        ) : (
          <>
            <p className={`mb-3 text-[13px] ${UI.txtSuave}`}>
              <b className={UI.txtTitulo}>{datos.total.opiniones}</b> opiniones · promedio{" "}
              <b className={UI.txtTitulo}>{promedioTxt(datos.total.promedio)} ★</b>
            </p>

            {podio.length ? (
              <ol className="flex flex-col gap-2.5">
                {podio.map((f, i) => (
                  <li key={f.empleado_id} className={`${UI.card} flex items-center gap-3 p-3 ${i === 0 ? "border-[#f59e0b]/60" : ""}`}>
                    <span className="relative">
                      <Cara fila={f} tam={i === 0 ? "h-14 w-14" : "h-12 w-12"} anillo={PODIO[i].anillo} />
                      <span
                        className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${PODIO[i].num}`}
                      >
                        {i + 1}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[15px] font-semibold ${UI.txtTitulo}`}>
                        {f.nombre}
                        {i === 0 && mes === mesPasado ? " 🎁" : ""}
                      </p>
                      <p className={`truncate text-[12px] ${UI.txtSuave}`}>
                        {f.oficina} · {f.opiniones} opiniones · {f.pct_cinco}% con 5★
                      </p>
                      {f.lo_mejor?.length ? (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {f.lo_mejor.map((t) => (
                            <span key={t} className="rounded-full bg-[#f59e0b]/12 px-2 py-0.5 text-[11px] font-medium text-[#b45309] dark:text-[#fbbf24]">
                              {t}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-none flex-col items-end">
                      <span className={`text-[22px] font-bold leading-none ${UI.txtTitulo}`}>{promedioTxt(f.promedio)}</span>
                      <Estrellas valor={f.promedio} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            {resto.length ? (
              <ol className={`${UI.card} mt-3 divide-y divide-linea dark:divide-linea-dark`} start={4}>
                {resto.map((f, i) => (
                  <li key={f.empleado_id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`w-5 text-center text-[13px] font-semibold ${UI.txtSuave}`}>{i + 4}</span>
                    <Cara fila={f} tam="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[14px] font-medium ${UI.txtTitulo}`}>{f.nombre}</p>
                      <p className={`truncate text-[12px] ${UI.txtSuave}`}>
                        {f.oficina} · {f.opiniones} opiniones
                      </p>
                    </div>
                    <span className={`text-[15px] font-semibold ${UI.txtTitulo}`}>{promedioTxt(f.promedio)} ★</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {enCamino.length ? (
              <div className="mt-4">
                <p className={`mb-2 text-[12px] font-semibold uppercase tracking-wide ${UI.txtSuave}`}>
                  En camino · hacen falta {minimo} opiniones para entrar
                </p>
                <ul className={`${UI.card} divide-y divide-linea dark:divide-linea-dark`}>
                  {enCamino.map((f) => (
                    <li key={f.empleado_id} className="flex items-center gap-3 px-3 py-2.5">
                      <Cara fila={f} tam="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[14px] font-medium ${UI.txtTitulo}`}>{f.nombre}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-linea dark:bg-linea-dark">
                          <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${(100 * f.opiniones) / minimo}%` }} />
                        </div>
                      </div>
                      <span className={`whitespace-nowrap text-[12px] ${UI.txtSuave}`}>
                        {f.faltan === 1 ? "le falta 1" : `le faltan ${f.faltan}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <PedirOpinion />
      </div>
    </div>
  );
}
