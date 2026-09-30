// src/components/gestoria/gestora/PerfilGestora.jsx
//
// 👤 «Perfil» de la app de la gestora (30/09):
//   - su foto (o sus iniciales), su nombre y su usuario;
//   - «Así te ve la oficina»: WhatsApp, email, dónde atiende y horario (los carga
//     el admin en Gestoría → Gestores; si algo está mal, le avisa a THAMES);
//   - modo oscuro y «Cerrar sesión».
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineMapPin,
  HiOutlineMoon,
} from "react-icons/hi2";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { Avatar, Cargando } from "../Piezas";
import { useGestora } from "./gestoraContext";
import { BarraTitulo, Tarjeta } from "./piezas";
import { foco, suave } from "./gestoraUtils";

function Dato({ icono, label, valor }) {
  const Icono = icono;
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3.5 py-2">
      <Icono className={`h-5 w-5 shrink-0 ${suave}`} strokeWidth={2} aria-hidden="true" />
      <span className="flex min-w-0 flex-col gap-px">
        <span className={`text-[12.5px] font-bold ${suave}`}>{label}</span>
        {valor ? (
          <span className="break-words text-[15.5px] font-bold text-titulo dark:text-titulo-dark">{valor}</span>
        ) : (
          <span className={`text-[15px] ${suave}`}>Sin cargar</span>
        )}
      </span>
    </div>
  );
}

export default function PerfilGestora() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { res } = useGestora();
  const p = res?.perfil || null;
  const nombre =
    p?.nombre || res?.gestor_nombre || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "";

  return (
    <>
      <BarraTitulo titulo="Perfil" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-[18px] px-4 pb-4 pt-[18px]">
        {/* Quién es */}
        <div className="flex items-center gap-3.5">
          <Avatar id={p?.id || user?.id} nombre={nombre} foto={p?.foto_url} size={64} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-words text-[22px] font-extrabold leading-tight text-titulo dark:text-titulo-dark">{nombre}</span>
            {user?.username ? <span className={`text-[14.5px] ${suave}`}>Usuario: {user.username}</span> : null}
          </span>
        </div>

        {/* Así la ve la oficina */}
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
              <Dato icono={HiOutlineMapPin} label="Dónde atendés" valor={p?.direccion} />
              <Dato icono={HiOutlineClock} label="Horario" valor={p?.horario} />
            </Tarjeta>
          )}
          <span className={`px-0.5 text-[13.5px] ${suave}`}>Si algo está mal (o querés cambiar la foto), avisale a THAMES y lo actualizan.</span>
        </section>

        {/* Modo oscuro */}
        <Tarjeta>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`flex min-h-[56px] w-full items-center justify-between gap-3 px-3.5 text-left ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
          >
            <span className="flex items-center gap-3 text-[16px] font-bold text-titulo dark:text-titulo-dark">
              <HiOutlineMoon className={`h-5 w-5 ${suave}`} strokeWidth={2} aria-hidden="true" />
              Modo oscuro
            </span>
            <span
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                isDark ? "bg-duo-violeta" : "bg-slate-300 dark:bg-slate-600"
              }`}
              aria-hidden="true"
            >
              <span className={`inline-block h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
            </span>
          </button>
        </Tarjeta>

        {/* Salir */}
        <button
          type="button"
          onClick={logout}
          className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-red-200 dark:border-red-500/40 bg-card dark:bg-card-dark text-[16px] font-extrabold text-duo-rojo-sombra dark:text-red-400 hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)] ${foco}`}
        >
          <HiOutlineArrowRightOnRectangle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          Cerrar sesión
        </button>
      </main>
    </>
  );
}
