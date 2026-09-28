// src/components/legales/AbogadosPanel.jsx
//
// 👩‍⚖️ ABOGADOS (solo admin): el perfil de cada abogado (foto, contacto, temas),
// su usuario para entrar a THAMES, los días y horarios para darle turnos, su %
// de comisión y cómo viene (casos, demorados, lo que debe).
//
// Ejemplo: "Dr. Martín Sosa · lun y mié 10 a 13 (5 Esquinas) · turnos de 30 min
// · 10%". Con eso la oficina ve sus horarios libres al dar un turno, y cuando
// él carga honorarios de $ 900.000, la comisión de THAMES es $ 90.000.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCamera, HiExclamation, HiLockClosed, HiPencil, HiPlus, HiX } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { useLegales } from "./legalesContext";
import {
  borrarAbogado,
  cobrarAbogado,
  crearAbogado,
  descartarAviso,
  editarAbogado,
  listarAbogados,
  mensajeError,
  subirFotoPerfil,
  usuariosSinFicha,
} from "../../services/legales";
import { Candado, Cargando } from "../gestoria/Piezas";
import { AvatarAbogado, Chip } from "./PiezasLegales";
import { ddmm, fmtPct, plata, temasTxt } from "./legalesUtils";

const inputCls =
  "w-full min-w-0 h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";
const labelCls = "flex flex-col gap-1 text-[12px] font-semibold text-suave dark:text-suave-dark min-w-0";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HORAS = (() => {
  const l = [];
  for (let h = 7; h <= 21; h += 1) {
    l.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21) l.push(`${String(h).padStart(2, "0")}:30`);
  }
  return l;
})();

const FORM_VACIO = {
  id: null,
  user: null, // usuario que ya existe (rol ABOGADO sin perfil)
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  horario: "",
  especialidades: [],
  agenda: [],
  duracion_turno: 30,
  comision_pct: "10",
  foto_url: "",
  foto_public_id: "",
  fotoCambio: false,
  username: "",
  password: "",
};

export default function AbogadosPanel() {
  const { catalogo, setFiltros, recargarAbogados } = useLegales();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [sinFicha, setSinFicha] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(FORM_VACIO);
  const [formAbierto, setFormAbierto] = useState(false);
  const [cobrar, setCobrar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([listarAbogados(), usuariosSinFicha()]);
      setLista(l);
      setSinFicha(s);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron traer los abogados."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar(), { cadaMs: 15000 });

  const activos = useMemo(() => (lista || []).filter((a) => a.activo), [lista]);
  const inactivos = useMemo(() => (lista || []).filter((a) => !a.activo), [lista]);

  const nuevo = (user = null) => {
    setForm({ ...FORM_VACIO, user: user ? user.id : null, nombre: user ? user.nombre : "", username: user ? user.username : "" });
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const editar = (a) => {
    setForm({
      ...FORM_VACIO,
      id: a.id,
      nombre: a.nombre || "",
      telefono: a.telefono || "",
      email: a.email || "",
      direccion: a.direccion || "",
      horario: a.horario || "",
      especialidades: a.especialidades || [],
      agenda: (a.agenda || []).map((b) => ({ ...b, oficina: b.oficina || "" })),
      duracion_turno: a.duracion_turno || 30,
      comision_pct: a.comision_pct != null ? String(Number(a.comision_pct)) : "0",
      foto_url: a.foto_url || "",
      username: a.usuario || "",
    });
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarActivo = async (a, activo) => {
    if (!activo && !window.confirm(`¿Desactivar a ${a.nombre}? No entra más a THAMES y no aparece para asignarle casos. Sus casos quedan con su nombre.`)) return;
    try {
      await editarAbogado(a.id, { activo });
      toast.success(activo ? `${a.nombre} activo` : `${a.nombre} desactivado`);
      cargar();
      recargarAbogados?.();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };
  const borrar = async (a) => {
    if (!window.confirm(`¿Borrar a ${a.nombre} y su usuario? No se puede deshacer.`)) return;
    try {
      await borrarAbogado(a.id);
      toast.success("Borrado");
      cargar();
      recargarAbogados?.();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };
  const descartar = async (aviso) => {
    if (!window.confirm("¿Descartar este comprobante? (ej: estaba equivocado)")) return;
    try {
      await descartarAviso(aviso.id);
      toast.success("Descartado");
      cargar();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };
  const verCasos = (a) => {
    setFiltros?.((f) => ({ ...f, abogado: String(a.id) }));
    navigate("/legales/casos");
  };

  if (error && !lista) return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!lista) return <Cargando alto="h-64" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-bold text-titulo dark:text-titulo-dark">
            Abogados <Candado />
          </h2>
          <p className="text-[13px] text-suave dark:text-suave-dark">
            Cada abogado entra con su usuario y ve <b>solo Legales</b> y <b>solo sus casos</b>. No ve pólizas, pagos ni Balances.
          </p>
        </div>
        {!formAbierto && (
          <button type="button" onClick={() => nuevo()} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 px-4 py-2.5 text-[14px] font-semibold text-white">
            <HiPlus className="w-4 h-4" /> Nuevo abogado
          </button>
        )}
      </div>

      {sinFicha.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
          <span className="inline-flex items-center gap-2">
            <HiExclamation className="w-4 h-4 shrink-0" />
            <span>
              El usuario <b>{u.username}</b> tiene rol ABOGADO pero no tiene perfil de abogado: hoy no ve ningún caso.
            </span>
          </span>
          <button type="button" onClick={() => nuevo(u)} className="rounded-lg border border-amber-600/50 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-amber-900 dark:text-amber-200">
            Completar su perfil
          </button>
        </div>
      ))}

      <div className={`grid grid-cols-1 gap-4 items-start ${formAbierto ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
        {formAbierto && (
          <div className="xl:order-2 min-w-0">
            <FormAbogado
              form={form}
              setForm={setForm}
              catalogo={catalogo}
              sinFicha={sinFicha}
              onCancelar={() => setFormAbierto(false)}
              onListo={() => {
                setFormAbierto(false);
                cargar();
                recargarAbogados?.();
              }}
            />
          </div>
        )}
        <div className="xl:order-1 flex flex-col gap-4 min-w-0">
          {!activos.length && !inactivos.length && (
            <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 text-[14px] text-suave dark:text-suave-dark">
              Todavía no hay abogados. Tocá «Nuevo abogado» para cargar el primero.
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activos.map((a) => (
              <TarjetaAbogado
                key={a.id}
                a={a}
                temas={catalogo?.temas || []}
                onEditar={() => editar(a)}
                onVer={() => verCasos(a)}
                onDesactivar={() => cambiarActivo(a, false)}
                onCobrar={() => setCobrar(a)}
                onDescartar={descartar}
              />
            ))}
          </div>
          {inactivos.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-semibold text-suave dark:text-suave-dark">Desactivados</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {inactivos.map((a) => (
                  <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
                    <div className="flex items-center gap-3">
                      <AvatarAbogado id={a.id} nombre={a.nombre} foto={a.foto_url} size={40} />
                      <span className="flex-1 min-w-0">
                        <strong className="block text-[15px] text-titulo dark:text-titulo-dark">{a.nombre}</strong>
                        <span className="text-[12px] text-suave dark:text-suave-dark">{temasTxt(a.especialidades, catalogo?.temas || []) || "—"}</span>
                      </span>
                      <Chip>Desactivado</Chip>
                    </div>
                    <p className="text-[12px] text-suave dark:text-suave-dark">No entra a THAMES y no aparece para asignar casos. Sus casos quedan con su nombre.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => cambiarActivo(a, true)} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                        Activar
                      </button>
                      {a.abiertos === 0 && (
                        <button type="button" onClick={() => borrar(a)} className="px-2 py-1.5 text-[13px] font-semibold text-duo-rojo">
                          Borrar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalCobrarTodo
        a={cobrar}
        formas={catalogo?.formas_pago || []}
        onCerrar={() => setCobrar(null)}
        onListo={(r) => {
          setCobrar(null);
          toast.success(`Cobradas ${r.cantidad} comisión(es): ${plata(r.total)} · entró a Balances`);
          cargar();
        }}
      />
    </div>
  );
}

function Stat({ n, txt, tono = "neutro" }) {
  const cls =
    tono === "rojo" && n
      ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
      : "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark";
  return (
    <span className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${cls}`}>
      <b className="text-[18px] leading-tight">{n}</b>
      <span className="text-[11px] text-suave dark:text-suave-dark">{txt}</span>
    </span>
  );
}

function TarjetaAbogado({ a, temas, onEditar, onVer, onDesactivar, onCobrar, onDescartar }) {
  const debe = Number(a.debe || 0);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AvatarAbogado id={a.id} nombre={a.nombre} foto={a.foto_url} size={52} />
        <span className="flex-1 min-w-0">
          <strong className="block text-[16px] text-titulo dark:text-titulo-dark">{a.nombre}</strong>
          <span className="mt-1 flex flex-wrap gap-1">
            {(a.especialidades || []).length ? (
              a.especialidades.map((t) => <Chip key={t}>{temasTxt([t], temas)}</Chip>)
            ) : (
              <Chip>Todos los temas</Chip>
            )}
          </span>
        </span>
        <Chip tono="verde">Activo</Chip>
      </div>
      <div className="flex flex-col gap-0.5 text-[12px] text-suave dark:text-suave-dark">
        <span>
          {a.telefono ? `WhatsApp ${a.telefono}` : "Sin WhatsApp"} · {a.email || "sin email"}
        </span>
        <span>{a.agenda_txt ? `Turnos: ${a.agenda_txt}` : `Sin turnos en THAMES${a.direccion ? ` · atiende en ${a.direccion}` : ""}`}</span>
        <span>
          Usuario: <b className="text-titulo dark:text-titulo-dark">{a.usuario || "—"}</b>
          {a.usuario && !a.usuario_activo ? " (no puede entrar)" : ""}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat n={a.abiertos} txt="abiertos" />
        <Stat n={a.demorados} txt="demorados" tono="rojo" />
        <Stat n={a.vencidas} txt="fecha vencida" tono="rojo" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linea dark:border-linea-dark pt-3 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-suave dark:text-suave-dark">
          <HiLockClosed className="w-3.5 h-3.5" /> Comisión {fmtPct(a.comision_pct)} ·{" "}
          {debe > 0 ? <b className="text-amber-800 dark:text-amber-300">debe {plata(debe)}</b> : "no debe nada"}
        </span>
        {a.sin_honorarios > 0 && <b className="text-amber-800 dark:text-amber-300">{a.sin_honorarios} cobrado{a.sin_honorarios > 1 ? "s" : ""} sin honorarios</b>}
        {debe > 0 && (
          <button type="button" onClick={onCobrar} className="rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-3 py-1.5 text-[12px] font-semibold text-white">
            Marcar cobrada
          </button>
        )}
      </div>
      {(a.avisos || []).map((av) => (
        <div key={av.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-3 py-2 text-[12px] text-sky-900 dark:text-sky-200">
          <span className="flex-1 min-w-0">
            «Ya pagué» {plata(av.monto)} · {ddmm(av.fecha)} ·{" "}
            <a href={av.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              ver comprobante
            </a>
          </span>
          <button type="button" onClick={() => onDescartar(av)} className="font-semibold underline">
            Descartar
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onEditar} className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
          <HiPencil className="w-4 h-4" /> Editar
        </button>
        <button type="button" onClick={onVer} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
          Ver sus casos
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onDesactivar} className="px-2 py-1.5 text-[13px] font-semibold text-suave dark:text-suave-dark hover:text-duo-rojo">
          Desactivar
        </button>
      </div>
    </div>
  );
}

function FormAbogado({ form, setForm, catalogo, sinFicha, onCancelar, onListo }) {
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const editando = !!form.id;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const oficinas = catalogo?.oficinas || [];

  const subirFoto = async (file) => {
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      const { url, public_id } = await subirFotoPerfil(file);
      setForm((f) => ({ ...f, foto_url: url, foto_public_id: public_id, fotoCambio: true }));
    } catch (e) {
      setError(e?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  const setBloque = (i, k, v) =>
    setForm((f) => ({ ...f, agenda: f.agenda.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));
  const agregarBloque = () =>
    setForm((f) => ({
      ...f,
      agenda: [...f.agenda, { dia: f.agenda.length ? Math.min(6, Number(f.agenda[f.agenda.length - 1].dia) + 1) : 0, desde: "10:00", hasta: "13:00", oficina: oficinas[0]?.id || "" }],
    }));

  const guardar = async () => {
    setError("");
    if (!form.nombre.trim()) return setError("Poné el nombre (ej: Dr. Martín Sosa).");
    const pct = Number(form.comision_pct);
    if (!(pct >= 0 && pct <= 100)) return setError("El % de comisión va de 0 a 100.");
    const body = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      direccion: form.direccion.trim(),
      horario: form.horario.trim(),
      especialidades: form.especialidades,
      agenda: form.agenda.map((b) => ({ dia: Number(b.dia), desde: b.desde, hasta: b.hasta, oficina: b.oficina ? Number(b.oficina) : null })),
      duracion_turno: Number(form.duracion_turno) || 30,
      comision_pct: pct,
    };
    // La foto se manda solo si cambió (así no se pisa la que ya tenía).
    if (!editando || form.fotoCambio) {
      body.foto_url = form.foto_url || "";
      body.foto_public_id = form.foto_public_id || "";
    }
    if (editando) {
      if (form.username.trim()) body.username = form.username.trim();
      if (form.password) body.password = form.password;
    } else if (form.user) {
      body.user = form.user;
    } else {
      if (!form.username.trim()) return setError("Poné el usuario para entrar a THAMES (ej: msosa).");
      if ((form.password || "").length < 6) return setError("La contraseña tiene que tener 6 letras o más.");
      body.username = form.username.trim();
      body.password = form.password;
    }
    setGuardando(true);
    try {
      if (editando) {
        const r = await editarAbogado(form.id, body);
        toast.success(r?.aplicado_a ? `Guardado · el % nuevo se aplicó a ${r.aplicado_a} caso(s) sin cobrar` : "Guardado");
      } else {
        await crearAbogado(body);
        toast.success("Abogado creado: ya puede entrar con su usuario");
      }
      onListo();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border-2 border-sky-700/60 bg-card dark:bg-card-dark p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">{editando ? `Editar · ${form.nombre}` : "Nuevo abogado"}</h3>
        <button type="button" onClick={onCancelar} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-suave hover:text-titulo" aria-label="Cerrar">
          <HiX className="w-5 h-5" />
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-semibold text-duo-rojo">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {form.foto_url ? (
          <img src={form.foto_url} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-linea" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-linea dark:border-linea-dark text-suave">
            <HiCamera className="w-6 h-6" />
          </span>
        )}
        <span className="flex flex-col gap-1">
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark ${subiendo ? "opacity-60 pointer-events-none" : ""}`}>
            {subiendo ? "Subiendo…" : form.foto_url ? "Cambiar foto" : "Subir foto o logo"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { subirFoto(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <span className="text-[11px] text-suave dark:text-suave-dark">
            Opcional. Se achica sola.{" "}
            {form.foto_url && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, foto_url: "", foto_public_id: "", fotoCambio: true }))} className="underline">
                Sacar
              </button>
            )}
          </span>
        </span>
      </div>

      <label className={labelCls}>
        Nombre y apellido
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Dr. Martín Sosa" className={inputCls} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">Temas que lleva (sirve para sugerirlo al cargar un caso)</span>
        <div className="flex flex-wrap gap-2">
          {(catalogo?.temas || []).map((t) => {
            const on = form.especialidades.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => set("especialidades", on ? form.especialidades.filter((x) => x !== t.id) : [...form.especialidades, t.id])}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                  on ? "border-sky-700 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300" : "border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
                }`}
              >
                <span className={`h-3.5 w-3.5 rounded-sm border ${on ? "bg-sky-700 border-sky-700" : "border-slate-400"}`} />
                {t.nombre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className={labelCls}>
          WhatsApp
          <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} inputMode="tel" placeholder="11 5555-0000" className={inputCls} />
        </label>
        <label className={labelCls}>
          Email
          <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="nombre@correo.com" className={inputCls} />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-linea dark:border-linea-dark p-3">
        <span className="text-[13px] font-bold text-titulo dark:text-titulo-dark">Días y horarios para turnos</span>
        <span className="text-[11px] text-suave dark:text-suave-dark">Con esto la oficina le da turnos sin tener que llamarlo.</span>
        {form.agenda.map((b, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_auto] gap-1.5 items-center">
            <select value={b.dia} onChange={(e) => setBloque(i, "dia", Number(e.target.value))} className={`${inputCls} px-1.5 text-[13px]`} aria-label="Día">
              {DIAS.map((d, j) => (
                <option key={d} value={j}>{d}</option>
              ))}
            </select>
            <select value={b.desde} onChange={(e) => setBloque(i, "desde", e.target.value)} className={`${inputCls} px-1.5 text-[13px]`} aria-label="Desde">
              {HORAS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select value={b.hasta} onChange={(e) => setBloque(i, "hasta", e.target.value)} className={`${inputCls} px-1.5 text-[13px]`} aria-label="Hasta">
              {HORAS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select value={b.oficina || ""} onChange={(e) => setBloque(i, "oficina", e.target.value)} className={`${inputCls} px-1.5 text-[13px]`} aria-label="Dónde">
              {oficinas.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
              <option value="">Por teléfono</option>
            </select>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, agenda: f.agenda.filter((_, j) => j !== i) }))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-suave hover:text-duo-rojo"
              aria-label="Sacar este horario"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={agregarBloque} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-sky-600/60 px-3 py-1.5 text-[13px] font-semibold text-sky-700 dark:text-sky-300">
            <HiPlus className="w-4 h-4" /> Agregar día
          </button>
          <label className="inline-flex items-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
            Cada turno dura
            <select value={form.duracion_turno} onChange={(e) => set("duracion_turno", Number(e.target.value))} className={`${inputCls} h-9 w-auto`}>
              {(catalogo?.duraciones_turno || [15, 20, 30, 45, 60]).map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </label>
        </div>
        {!form.agenda.length && (
          <p className="text-[12px] text-suave dark:text-suave-dark">Sin días cargados, la oficina no ve horarios para darle turno.</p>
        )}
      </div>

      <details className="rounded-lg border border-linea dark:border-linea-dark px-3 py-2">
        <summary className="cursor-pointer text-[13px] font-semibold text-titulo dark:text-titulo-dark">Si atiende en su estudio (opcional)</summary>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <label className={labelCls}>
            Dirección
            <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Ej: Av. Rivadavia 1234, Morón" className={inputCls} />
          </label>
          <label className={labelCls}>
            Horario
            <input value={form.horario} onChange={(e) => set("horario", e.target.value)} placeholder="Ej: lunes a viernes de 9 a 13" className={inputCls} />
          </label>
        </div>
      </details>

      <label className={labelCls}>
        <span className="inline-flex items-center gap-1">
          % de comisión para THAMES <HiLockClosed className="w-3 h-3" />
        </span>
        <input value={form.comision_pct} onChange={(e) => set("comision_pct", e.target.value)} type="number" min="0" max="100" step="0.5" className={`${inputCls} max-w-[140px]`} />
      </label>

      <div className="flex flex-col gap-2 border-t border-linea dark:border-linea-dark pt-3">
        <span className="text-[13px] font-bold text-titulo dark:text-titulo-dark">Para entrar a THAMES</span>
        {!editando && sinFicha.length > 0 && (
          <label className={labelCls}>
            ¿Ya tiene usuario?
            <select value={form.user || ""} onChange={(e) => set("user", e.target.value ? Number(e.target.value) : null)} className={inputCls}>
              <option value="">No, crear uno nuevo</option>
              {sinFicha.map((u) => (
                <option key={u.id} value={u.id}>
                  Sí: {u.username} ({u.nombre})
                </option>
              ))}
            </select>
          </label>
        )}
        {(editando || !form.user) && (
          <div className="grid grid-cols-2 gap-2.5">
            <label className={labelCls}>
              Usuario
              <input value={form.username} onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))} placeholder="msosa" autoComplete="off" className={inputCls} />
            </label>
            <label className={labelCls}>
              {editando ? "Contraseña nueva" : "Contraseña"}
              <input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder={editando ? "(dejala vacía)" : "6 letras o más"}
                className={inputCls}
              />
            </label>
          </div>
        )}
        <p className="text-[11px] text-suave dark:text-suave-dark">Con este usuario ve solo Legales y solo sus casos.</p>
      </div>

      <div className="flex gap-2">
        <Boton3D variant="blanco" onClick={onCancelar} className="flex-1">
          Cancelar
        </Boton3D>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || subiendo}
          className="flex-[2] rounded-lg bg-sky-700 hover:bg-sky-800 px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear abogado"}
        </button>
      </div>
    </div>
  );
}

function ModalCobrarTodo({ a, formas = [], onCerrar, onListo }) {
  const [forma, setForma] = useState("TRANSFERENCIA");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (a) {
      setForma("TRANSFERENCIA");
      setError("");
    }
  }, [a]);
  const cobrar = async () => {
    setGuardando(true);
    setError("");
    try {
      onListo(await cobrarAbogado(a.id, forma));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <ModalDuo
      isOpen={!!a}
      onClose={onCerrar}
      size="sm"
      title={a ? `Cobrarle todo a ${a.nombre}` : ""}
      subtitle={a ? `${a.pendientes} comisión(es) · ${plata(a.debe)}` : ""}
      iconTono="verde"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">
            Volver
          </Boton3D>
          <Boton3D variant="verde" onClick={cobrar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? "Cobrando…" : "Marcar cobradas"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-duo-rojo-soft px-3 py-2 text-[13px] font-semibold text-duo-rojo">{error}</p>}
        <label className={labelCls}>
          ¿Cómo te pagó?
          <select value={forma} onChange={(e) => setForma(e.target.value)} className={inputCls}>
            {(formas.length ? formas : [{ id: "TRANSFERENCIA", nombre: "Transferencia" }]).map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </label>
        <p className="text-[13px] text-suave dark:text-suave-dark">
          Cada una entra a Balances como «Comisión legales», <b>sin oficina</b>. Si subió un «Ya pagué», el comprobante queda en cada caso.
        </p>
      </div>
    </ModalDuo>
  );
}
