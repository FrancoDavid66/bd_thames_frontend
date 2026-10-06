// src/components/legales/abogado/PerfilAbogado.jsx
//
// 👤 «Perfil» de la app del abogado (05/10): su foto y su nombre, cómo lo ve la
// oficina (puede cambiar su contacto y su foto), el acceso a «Estados y listas»,
// modo oscuro y «Cerrar sesión». Los días de turnos y su % los cambia THAMES.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCalendarDays,
  HiOutlineCamera,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineMapPin,
  HiOutlineMoon,
  HiOutlinePencilSquare,
} from "react-icons/hi2";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { editarAbogado, mensajeError, subirFotoPerfil } from "../../../services/legales";
import { Cargando } from "../../gestoria/Piezas";
import { AvatarAbogado } from "../PiezasLegales";
import { temasTxt, volverOIr } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { foco, suave } from "./abogadoUtils";
import { BarraVolver, Tarjeta } from "./piezasAbogado";
import { HojaPerfil } from "./hojas";

function Dato({ icono, label, valor }) {
  const Icono = icono;
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3.5 py-2">
      <Icono className={`h-5 w-5 shrink-0 ${suave}`} strokeWidth={2} aria-hidden="true" />
      <span className="flex min-w-0 flex-col gap-px">
        <span className={`text-[12.5px] font-bold ${suave}`}>{label}</span>
        {valor ? <span className="break-words text-[15.5px] font-bold text-titulo dark:text-titulo-dark">{valor}</span> : <span className={`text-[15px] ${suave}`}>Sin cargar</span>}
      </span>
    </div>
  );
}

export default function PerfilAbogado() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { catalogo, yo, res, cargar } = useAbogado();
  const navigate = useNavigate();
  const [editando, setEditando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const p = res?.perfil || null;
  const nombre = p?.nombre || yo?.nombre || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "";

  const cambiarFoto = async (file) => {
    if (!file || !yo || subiendo) return;
    setSubiendo(true);
    try {
      const { url, public_id } = await subirFotoPerfil(file);
      await editarAbogado(yo.id, { foto_url: url, foto_public_id: public_id });
      toast.success("Foto actualizada");
      cargar();
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo cambiar la foto."));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <BarraVolver titulo="Perfil" onVolver={() => volverOIr(navigate, "/legales")} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-[18px] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[18px]">
        <div className="flex items-center gap-3.5">
          <AvatarAbogado id={p?.id || yo?.id} nombre={nombre} foto={p?.foto_url || yo?.foto_url} size={64} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-words text-[22px] font-extrabold leading-tight text-titulo dark:text-titulo-dark">{nombre}</span>
            <span className={`text-[14px] ${suave}`}>{temasTxt(p?.especialidades, catalogo?.temas || []) || "Todos los temas"}</span>
            {user?.username ? <span className={`text-[13.5px] ${suave}`}>Usuario: {user.username}</span> : null}
          </span>
        </div>

        <section className="flex flex-col gap-2" aria-labelledby="titulo-como-te-ven">
          <h2 id="titulo-como-te-ven" className="px-0.5 text-[17px] font-extrabold text-titulo dark:text-titulo-dark">
            Así te ve la oficina
          </h2>
          {!res ? (
            <Cargando alto="h-56" />
          ) : (
            <Tarjeta lista>
              <Dato icono={HiOutlineChatBubbleOvalLeft} label="WhatsApp" valor={p?.telefono} />
              <Dato icono={HiOutlineEnvelope} label="Email" valor={p?.email} />
              <Dato icono={HiOutlineMapPin} label="Tu estudio" valor={p?.direccion} />
              <Dato icono={HiOutlineClock} label="Horario" valor={p?.horario} />
              <Dato icono={HiOutlineCalendarDays} label="Días de turnos" valor={p?.agenda_txt} />
            </Tarjeta>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEditando(true)} disabled={!p} className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark text-[15px] font-extrabold text-titulo dark:text-titulo-dark disabled:opacity-50 ${foco}`}>
              <HiOutlinePencilSquare className="h-5 w-5" aria-hidden="true" /> Editar mis datos
            </button>
            <label className={`inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark text-[15px] font-extrabold text-titulo dark:text-titulo-dark ${subiendo ? "pointer-events-none opacity-60" : ""}`}>
              <HiOutlineCamera className="h-5 w-5" aria-hidden="true" /> {subiendo ? "Subiendo…" : p?.foto_url ? "Cambiar la foto" : "Subir mi foto"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={subiendo}
                onChange={(ev) => {
                  cambiarFoto(ev.target.files?.[0]);
                  ev.target.value = "";
                }}
              />
            </label>
          </div>
          <span className={`px-0.5 text-[13.5px] ${suave}`}>Los días de turnos y tu % de comisión los cambia THAMES.</span>
        </section>

        <Tarjeta lista>
          <Link to="/legales/listas" className={`flex min-h-[60px] items-center gap-3 px-3.5 ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}>
            <HiOutlineAdjustmentsHorizontal className={`h-5 w-5 ${suave}`} strokeWidth={2} aria-hidden="true" />
            <span className="flex flex-1 flex-col">
              <span className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Estados y listas</span>
              <span className={`text-[13px] ${suave}`}>Tus estados, instancias y etiquetas</span>
            </span>
            <HiOutlineChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
          </Link>
          <button type="button" role="switch" aria-checked={isDark} onClick={toggleTheme} className={`flex min-h-[56px] w-full items-center justify-between gap-3 px-3.5 text-left ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}>
            <span className="flex items-center gap-3 text-[16px] font-bold text-titulo dark:text-titulo-dark">
              <HiOutlineMoon className={`h-5 w-5 ${suave}`} strokeWidth={2} aria-hidden="true" />
              Modo oscuro
            </span>
            <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${isDark ? "bg-duo-violeta" : "bg-slate-300 dark:bg-slate-600"}`} aria-hidden="true">
              <span className={`inline-block h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
            </span>
          </button>
        </Tarjeta>

        <button type="button" onClick={logout} className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-red-200 dark:border-red-500/40 bg-card dark:bg-card-dark text-[16px] font-extrabold text-duo-rojo-sombra dark:text-red-400 hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)] ${foco}`}>
          <HiOutlineArrowRightOnRectangle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          Cerrar sesión
        </button>
      </main>

      <HojaPerfil
        abierto={editando}
        perfil={p}
        onCerrar={() => setEditando(false)}
        onGuardar={async (body) => {
          await editarAbogado(yo.id, body);
          toast.success("Datos guardados");
          setEditando(false);
          cargar();
        }}
      />
    </>
  );
}
