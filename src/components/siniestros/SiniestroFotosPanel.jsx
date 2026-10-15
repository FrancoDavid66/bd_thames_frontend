// src/components/siniestros/SiniestroFotosPanel.jsx
//
// 🏷️ ETIQUETAS DE FOTOS (12/10/2026) — OPCIONALES
//    Cada foto puede decir QUÉ muestra, para armar el reclamo rápido:
//      Auto del asegurado · Papeles del asegurado · Auto del tercero ·
//      Papeles del tercero · Lugar del hecho · Lesiones · Otro
//    · Después de subir, el panel pregunta "¿Qué muestra esta foto?". Se puede
//      tocar «Saltar» y la foto queda "Sin etiqueta" (como todas las viejas).
//    · Desde la 2ª vez aparece "Igual que la anterior" (un toque).
//    · Arriba: filtros por etiqueta. Las fotos se ven agrupadas por etiqueta.
//    · «Seleccionar» → marcar varias → una etiqueta para todas.
//    · En el visor (foto grande): se ve la etiqueta y se puede cambiar.
//    · Embistente / embestido NO se elige: sale del tipo de siniestro
//      (prop `responsabilidad`): CHOCO → el auto del asegurado es el embistente;
//      CHOCARON → al revés. Robo / incendio / otro → no se muestra.
//    · Borrador (alta en el wizard): la etiqueta viaja con la foto y se guarda
//      cuando se crea el siniestro (SiniestrosPage → subirFotosBorrador).
//    · Etiquetar lo puede hacer cualquiera de la oficina; borrar, solo el admin.
//    · El visor, la hoja de etiquetas y la barra de selección se dibujan en
//      document.body (createPortal): adentro de un modal animado, `fixed` se
//      corre de lugar.
//
// 📱 RESPONSIVE: en el celu los botones de cada foto se ven siempre (no hay
//    hover); en la compu, el de borrar aparece al pasar el mouse.
//
// 🐛 FIX (fotos que se perdían al cargar un siniestro):
//   1) Al elegir VARIAS fotos de la galería quedaba solo la ÚLTIMA: cada foto
//      se sumaba a la lista "vieja" (la de antes de empezar) y pisaba a la
//      anterior. Ahora se suma siempre a la lista AL DÍA (draftRef).
//   2) Las fotos se achican antes de subir (comprimirImagen): una foto del
//      celu de 6 MB pasa a ~300 KB → sube en 1-2 s y no rebota por tamaño.
//   3) El panel le avisa al padre mientras está subiendo (onUploadingChange)
//      para que el wizard no deje "Guardar" con una foto a medio subir.
//   4) Si una foto falla, el cartel dice POR QUÉ.
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiPhotograph, HiCamera, HiX, HiTrash, HiTruck, HiIdentification,
  HiLocationMarker, HiHeart, HiDotsHorizontal, HiTag, HiCheck,
  HiChevronLeft, HiChevronRight, HiPlus,
} from "react-icons/hi";
import { toast } from "react-hot-toast";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { comprimirImagen } from "../../utils/comprimirImagen";
import { useAuth } from "../../context/AuthContext";
import {
  getFotosBySiniestro,
  addFoto,
  removeFoto,
  updateFoto,
} from "../../store/slices/siniestrosSlice";

/**
 * Galería de fotos del siniestro.
 * - Modo PERSISTENTE: se pasa siniestroId → usa el slice (fotos guardadas).
 * - Modo BORRADOR: sin siniestroId → guarda en memoria (draftFotos/onDraftChange).
 *   Se usa en el wizard: las fotos se suben al crear el siniestro.
 *
 * @param {number|string} siniestroId  ID del siniestro (persistente).
 * @param {boolean} compact            Layout compacto.
 * @param {Array} draftFotos           Fotos en memoria (modo borrador).
 * @param {Function} onDraftChange     Callback con la lista nueva (borrador).
 * @param {boolean} readOnly           Solo mostrar (no subir/borrar/etiquetar).
 * @param {Function} onUploadingChange Avisa al padre: true = subiendo, false = terminó.
 * @param {string} responsabilidad     Tipo de siniestro (CHOCO, CHOCARON, ROBO…):
 *                                     sirve para decir quién es el embistente.
 */

// ──────────────────────────────────────────────────────────────────
// 🏷️ Etiquetas (las mismas que SiniestroFoto.ETIQUETAS del backend)
// ──────────────────────────────────────────────────────────────────
const ETIQUETAS = [
  { key: "AUTO_ASEGURADO", label: "Auto del asegurado", desc: "Daños, frente, cola y patente del auto de nuestro cliente", tono: "azul", Icon: HiTruck, lado: "asegurado" },
  { key: "DOC_ASEGURADO", label: "Papeles del asegurado", desc: "Registro, cédula del auto, DNI", tono: "azul", Icon: HiIdentification },
  { key: "AUTO_TERCERO", label: "Auto del tercero", desc: "Daños y patente del otro auto", tono: "rojo", Icon: HiTruck, lado: "tercero" },
  { key: "DOC_TERCERO", label: "Papeles del tercero", desc: "Registro, cédula, DNI y seguro del tercero", tono: "rojo", Icon: HiIdentification },
  { key: "LUGAR", label: "Lugar del hecho", desc: "Esquina, calle, semáforo, marcas en el piso", tono: "verde", Icon: HiLocationMarker },
  { key: "LESIONES", label: "Lesiones", desc: "Heridas, constancia médica", tono: "amarillo", Icon: HiHeart },
  { key: "OTRO", label: "Otro", desc: "Denuncia policial, presupuesto, lo que sea", tono: "gris", Icon: HiDotsHorizontal },
];
const POR_KEY = Object.fromEntries(ETIQUETAS.map((e) => [e.key, e]));
const SIN = "SIN";                                   // grupo "Sin etiqueta"
const ORDEN = [...ETIQUETAS.map((e) => e.key), SIN]; // orden de los grupos en pantalla

// Clases escritas completas (Tailwind solo genera las que ve escritas).
const TONO = {
  azul:     { txt: "text-duo-azul",     soft: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]",         dot: "bg-duo-azul" },
  rojo:     { txt: "text-duo-rojo",     soft: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",         dot: "bg-duo-rojo" },
  verde:    { txt: "text-duo-verde",    soft: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",       dot: "bg-duo-verde" },
  amarillo: { txt: "text-duo-amarillo", soft: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]", dot: "bg-duo-amarillo" },
  gris:     { txt: "text-suave dark:text-suave-dark", soft: "bg-surface dark:bg-surface-dark",                      dot: "bg-suave" },
};

const grupoDe = (foto) => (foto?.etiqueta && POR_KEY[foto.etiqueta] ? foto.etiqueta : SIN);

// Embistente / embestido según el tipo de siniestro. Ej: "Chocó" (CHOCO) →
// el auto del asegurado es el embistente y el del tercero, el embestido.
function rolDe(key, responsabilidad) {
  const lado = POR_KEY[key]?.lado;
  if (!lado) return null;
  if (responsabilidad === "CHOCO") return lado === "asegurado" ? "Embistente" : "Embestido";
  if (responsabilidad === "CHOCARON") return lado === "asegurado" ? "Embestido" : "Embistente";
  return null;
}

function RolPill({ etiqueta, responsabilidad }) {
  const rol = rolDe(etiqueta, responsabilidad);
  if (!rol) return null;
  const t = TONO[POR_KEY[etiqueta].tono];
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${t.soft} ${t.txt}`}>
      {rol}
    </span>
  );
}

// Lista vacía ÚNICA: si el selector devolviera un [] nuevo cada vez, el panel
// se redibujaría con cada cambio del store (y react-redux avisa en consola).
const SIN_FOTOS = [];

// Saca un motivo legible de un error (Cloudinary, backend o red).
function motivoError(err) {
  if (!err) return "";
  if (typeof err === "string") return err.trim().startsWith("<") ? "" : err;
  if (err.message) return String(err.message);
  if (err.detail) return String(err.detail);
  if (typeof err === "object") {
    const primero = Object.values(err)[0];
    if (Array.isArray(primero)) return String(primero[0] ?? "");
    if (primero) return String(primero);
  }
  return "";
}

export default function SiniestroFotosPanel({
  siniestroId,
  compact = false,
  draftFotos,
  onDraftChange,
  readOnly = false,
  onUploadingChange,
  responsabilidad,
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;

  const isDraft = !siniestroId;
  const key = siniestroId ? String(siniestroId) : null;

  const fotosPersistidas = useSelector(
    (state) => (key ? state.siniestros.fotos?.[key] : null) || SIN_FOTOS
  );
  const loading = useSelector(
    (state) => (key ? state.siniestros.fotosLoading?.[key] : false) || false
  );

  const fotos = isDraft ? (draftFotos || SIN_FOTOS) : fotosPersistidas;

  const [uploading, setUploading] = useState(false);
  const [filtro, setFiltro] = useState("TODAS");        // "TODAS" | etiqueta | SIN
  const [modoSel, setModoSel] = useState(false);
  const [seleccion, setSeleccion] = useState([]);       // ids marcados
  const [hoja, setHoja] = useState(null);               // { ids, subida } → "¿Qué muestra?"
  const [visor, setVisor] = useState(null);             // { ids, i } → foto en grande
  const [ultima, setUltima] = useState(null);           // última etiqueta usada
  const galeriaRef = useRef(null);  // input galería (sin capture)
  const camaraRef = useRef(null);   // input cámara (capture="environment")
  const toqueX = useRef(null);      // deslizar en el visor (celu)

  // 🐛 FIX: lista borrador SIEMPRE al día. Mientras suben varias fotos seguidas,
  // la prop `draftFotos` que ve la función es la de cuando arrancó (vieja).
  const draftRef = useRef(draftFotos || []);
  useEffect(() => { draftRef.current = draftFotos || []; }, [draftFotos]);

  // ¿El panel sigue en pantalla? (si cerraron el wizard a mitad de una subida)
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (siniestroId) dispatch(getFotosBySiniestro(siniestroId));
  }, [dispatch, siniestroId]);

  // ── Grupos, filtros y orden en pantalla ─────────────────────────
  const conteo = useMemo(() => {
    const c = {};
    fotos.forEach((f) => { const g = grupoDe(f); c[g] = (c[g] || 0) + 1; });
    return c;
  }, [fotos]);
  const hayEtiquetas = fotos.some((f) => grupoDe(f) !== SIN);
  const filtroOk = filtro === "TODAS" || conteo[filtro] ? filtro : "TODAS"; // si el grupo quedó vacío
  const grupos = useMemo(
    () => ORDEN
      .filter((g) => (filtroOk === "TODAS" || filtroOk === g) && conteo[g])
      .map((g) => ({ key: g, fotos: fotos.filter((f) => grupoDe(f) === g) })),
    [fotos, conteo, filtroOk]
  );
  const visibles = useMemo(() => grupos.flatMap((g) => g.fotos), [grupos]); // orden del visor
  const agrupar = hayEtiquetas; // sin ninguna etiqueta: una sola grilla, como siempre
  const puedeEtiquetar = !readOnly;

  // ── Subir ───────────────────────────────────────────────────────
  const procesarArchivos = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    onUploadingChange?.(true);
    const folder = `de-thames/siniestros/${siniestroId || "borrador"}/fotos`;
    let okCount = 0;
    let failCount = 0;
    let motivo = "";
    const nuevas = [];   // ids de las fotos que se subieron (para preguntar la etiqueta)

    for (const file of files) {
      // Borrador + wizard cerrado: no seguimos sumando fotos a un wizard que ya no está.
      if (isDraft && !aliveRef.current) break;
      try {
        // 📷 Achicamos antes de subir (si no se puede, sube la original).
        const chica = await comprimirImagen(file);
        const up = await uploadToCloudinary(chica, { folder });
        if (!up?.secure_url || !up?.public_id) {
          throw new Error("Cloudinary no devolvió la foto");
        }
        if (isDraft) {
          if (!aliveRef.current) break;
          const nuevaFoto = {
            id: `temp-${Date.now()}-${Math.random()}`,
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
            etiqueta: "",
            _isDraft: true,
          };
          // 🐛 FIX: sumamos a la lista AL DÍA (antes: a la lista vieja → se pisaban).
          const lista = [...draftRef.current, nuevaFoto];
          draftRef.current = lista;
          onDraftChange?.(lista);
          nuevas.push(nuevaFoto.id);
        } else {
          const creada = await dispatch(addFoto({
            siniestro_id: Number(siniestroId),
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
          })).unwrap();
          if (creada?.id != null) nuevas.push(creada.id);
        }
        okCount++;
      } catch (err) {
        console.error("[FotosPanel] Error subiendo", file.name, err);
        failCount++;
        if (!motivo) motivo = motivoError(err);
      }
    }

    if (aliveRef.current) setUploading(false);
    onUploadingChange?.(false);
    if (failCount > 0) {
      const base = failCount > 1 ? `${failCount} fotos no se pudieron subir` : "1 foto no se pudo subir";
      toast.error(motivo ? `${base}: ${motivo}` : base, { duration: 6000 });
    }
    if (okCount > 0 && aliveRef.current) {
      if (puedeEtiquetar && nuevas.length) {
        // 🏷️ Preguntamos qué muestran (opcional: se puede Saltar).
        setFiltro("TODAS");
        setHoja({ ids: nuevas, subida: true });
      } else {
        toast.success(`${okCount} foto${okCount > 1 ? "s" : ""} subida${okCount > 1 ? "s" : ""}`);
      }
    }
  };

  const onGaleria = (e) => { procesarArchivos(e.target.files); if (galeriaRef.current) galeriaRef.current.value = ""; };
  const onCamara = (e) => { procesarArchivos(e.target.files); if (camaraRef.current) camaraRef.current.value = ""; };

  // ── Etiquetar ───────────────────────────────────────────────────
  const salirSeleccion = () => { setModoSel(false); setSeleccion([]); };

  const aplicarEtiqueta = async (ids, etiqueta) => {
    const valor = etiqueta || "";
    const n = ids.length;
    setHoja(null);
    if (valor) setUltima(valor);
    salirSeleccion();
    const aviso = () => {
      if (!valor) toast.success(n > 1 ? `Etiqueta quitada de ${n} fotos` : "Etiqueta quitada");
      else toast.success(n > 1 ? `${n} fotos: ${POR_KEY[valor].label}` : `Etiqueta: ${POR_KEY[valor].label}`);
    };

    if (isDraft) {
      const lista = draftRef.current.map((f) => (ids.includes(f.id) ? { ...f, etiqueta: valor } : f));
      draftRef.current = lista;
      onDraftChange?.(lista);
      aviso();
      return;
    }

    const res = await Promise.allSettled(
      ids.map((id) => dispatch(updateFoto({ fotoId: id, siniestroId, etiqueta: valor })).unwrap())
    );
    const fallas = res.filter((r) => r.status === "rejected");
    if (fallas.length) {
      const m = motivoError(fallas[0].reason);
      const base = fallas.length > 1 ? `${fallas.length} fotos no se pudieron etiquetar` : "No se pudo guardar la etiqueta";
      toast.error(m ? `${base}: ${m}` : base, { duration: 6000 });
    } else {
      aviso();
    }
  };

  // ── Borrar ──────────────────────────────────────────────────────
  const handleDelete = async (foto) => {
    if (!window.confirm("¿Eliminar esta foto? No se puede deshacer.")) return;
    if (isDraft) {
      const lista = draftRef.current.filter((f) => f.id !== foto.id);
      draftRef.current = lista;
      onDraftChange?.(lista);
      return;
    }
    try {
      await dispatch(removeFoto({ fotoId: foto.id, siniestroId })).unwrap();
      toast.success("Foto eliminada");
    } catch {
      toast.error("Error al eliminar la foto");
    }
  };

  const canDelete = () => {
    if (readOnly) return false;
    if (isDraft) return true;
    return isAdmin;
  };

  // ── Tocar una foto: en modo selección la marca; si no, la abre grande ──
  const tocarFoto = (foto) => {
    if (modoSel) {
      setSeleccion((s) => (s.includes(foto.id) ? s.filter((x) => x !== foto.id) : [...s, foto.id]));
      return;
    }
    const ids = visibles.map((f) => f.id);
    setVisor({ ids, i: Math.max(0, ids.indexOf(foto.id)) });
  };

  const fotoVisor = visor ? fotos.find((f) => f.id === visor.ids[visor.i]) : null;
  const mover = (d) => setVisor((v) => {
    if (!v) return v;
    const i = v.i + d;
    return i < 0 || i >= v.ids.length ? v : { ...v, i };
  });

  // Si borraron la foto que se estaba viendo, cerramos el visor.
  useEffect(() => {
    if (visor && !fotoVisor) setVisor(null);
  }, [visor, fotoVisor]);

  // ⌨️ Esc / flechas. En captura y sin propagar: así Esc no cierra también
  //    el panel o el modal de atrás.
  useEffect(() => {
    if (!visor && !hoja && !modoSel) return undefined;
    const tecla = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (hoja) setHoja(null);
        else if (visor) setVisor(null);
        else salirSeleccion();
      } else if (visor && !hoja && e.key === "ArrowLeft") mover(-1);
      else if (visor && !hoja && e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  });

  // ── Partes de la pantalla ───────────────────────────────────────
  const botonEtiqueta = (foto) => {
    const e = POR_KEY[foto.etiqueta];
    if (e) {
      const t = TONO[e.tono];
      const contenido = <e.Icon className={`w-[17px] h-[17px] ${t.txt}`} />;
      const clase = "absolute left-1.5 bottom-1.5 h-8 w-8 rounded-full bg-card dark:bg-card-dark shadow-md flex items-center justify-center";
      return puedeEtiquetar ? (
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); setHoja({ ids: [foto.id], subida: false }); }}
          className={clase}
          title={`${e.label} · tocá para cambiar`}
          aria-label={`Etiqueta: ${e.label}. Cambiar`}
        >
          {contenido}
        </button>
      ) : (
        <span className={clase} title={e.label}>{contenido}</span>
      );
    }
    if (!puedeEtiquetar) return null;
    return (
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); setHoja({ ids: [foto.id], subida: false }); }}
        className="absolute left-1.5 bottom-1.5 h-8 px-2.5 rounded-full bg-black/60 text-white border border-dashed border-white/75 text-[11px] font-semibold flex items-center gap-1"
      >
        <HiPlus className="w-3 h-3" /> Etiquetar
      </button>
    );
  };

  const renderFoto = (foto) => {
    const sel = seleccion.includes(foto.id);
    return (
      <motion.div
        key={foto.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`relative group aspect-square rounded-lg overflow-hidden bg-surface dark:bg-surface-dark border ${
          sel ? "border-duo-violeta ring-[3px] ring-inset ring-duo-violeta" : "border-linea dark:border-linea-dark"
        }`}
      >
        <button
          type="button"
          onClick={() => tocarFoto(foto)}
          className={`absolute inset-0 w-full h-full ${modoSel ? "cursor-pointer" : "cursor-zoom-in"}`}
          aria-label={modoSel ? (sel ? "Desmarcar foto" : "Marcar foto") : "Ver en grande"}
        >
          <img
            src={foto.url}
            alt={foto.nombre || "Foto"}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform ${sel ? "scale-[.92] rounded-md" : ""}`}
          />
        </button>

        {foto._isDraft && !modoSel && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-duo-amarillo text-duo-texto pointer-events-none">
            Nueva
          </span>
        )}

        {modoSel ? (
          <span
            className={`absolute top-1.5 right-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center pointer-events-none ${
              sel ? "bg-duo-violeta border-duo-violeta text-white" : "bg-black/30 border-white"
            }`}
            aria-hidden="true"
          >
            {sel && <HiCheck className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <>
            {canDelete() && (
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); handleDelete(foto); }}
                className="absolute top-1.5 right-1.5 h-9 w-9 sm:h-8 sm:w-8 rounded-lg bg-duo-rojo text-white flex items-center justify-center shadow-lg sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                title="Eliminar"
                aria-label="Eliminar foto"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            )}
            {botonEtiqueta(foto)}
          </>
        )}
      </motion.div>
    );
  };

  const gridClass = `grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4"}`;

  // ── Hoja "¿Qué muestra esta foto?" ──────────────────────────────
  const renderHoja = () => {
    if (!hoja) return null;
    const sel = fotos.filter((f) => hoja.ids.includes(f.id));
    if (!sel.length) return null;
    const n = sel.length;
    const etiquetasSel = new Set(sel.map((f) => f.etiqueta || ""));
    const actual = etiquetasSel.size === 1 ? [...etiquetasSel][0] : null;
    const algunaConEtiqueta = sel.some((f) => f.etiqueta);
    const titulo = n === 1 ? "¿Qué muestra esta foto?" : `¿Qué muestran estas ${n} fotos?`;
    const sub = hoja.subida
      ? `${n === 1 ? "Foto subida" : `${n} fotos subidas`}. La etiqueta es opcional.`
      : n === 1 ? "Elegí una etiqueta o quitala." : "Se les pone la misma etiqueta a todas.";
    const rep = hoja.subida && ultima ? POR_KEY[ultima] : null;
    const cerrar = () => setHoja(null);

    return (
      <motion.div
        key="hoja"
        className="fixed inset-0 z-[210] bg-black/55 flex items-end sm:items-center justify-center sm:p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => { e.stopPropagation(); cerrar(); }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          initial={{ y: 40, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto bg-card dark:bg-card-dark rounded-t-2xl sm:rounded-2xl shadow-2xl px-4 pt-2 sm:pt-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
        >
          <div className="sm:hidden w-10 h-1 rounded-full bg-linea dark:bg-linea-dark mx-auto mb-3" />

          <div className="flex items-center gap-3 mb-3">
            {n === 1 ? (
              <img src={sel[0].url} alt="" className="h-14 w-14 rounded-xl object-cover border border-linea dark:border-linea-dark shrink-0" />
            ) : (
              <div className="relative h-14 w-16 shrink-0">
                <img src={sel[1].url} alt="" className="absolute left-0 top-1.5 h-12 w-12 rounded-lg object-cover border-2 border-card dark:border-card-dark -rotate-6" />
                <img src={sel[0].url} alt="" className="absolute left-3 top-0 h-12 w-12 rounded-lg object-cover border-2 border-card dark:border-card-dark rotate-3" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-titulo dark:text-titulo-dark">{titulo}</h4>
              <p className="text-xs text-suave dark:text-suave-dark">{sub}</p>
            </div>
          </div>

          {rep && (
            <button
              type="button"
              onClick={() => aplicarEtiqueta(hoja.ids, rep.key)}
              className="w-full flex items-center gap-3 rounded-xl border-[1.5px] border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] px-3 py-2.5 mb-2 text-left"
            >
              <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${TONO[rep.tono].soft}`}>
                <rep.Icon className={`w-5 h-5 ${TONO[rep.tono].txt}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-suave dark:text-suave-dark">Igual que la anterior</span>
                <span className="block text-sm font-semibold text-titulo dark:text-titulo-dark">{rep.label}</span>
              </span>
            </button>
          )}

          <div className="flex flex-col gap-0.5" role="menu">
            {ETIQUETAS.map((e) => {
              const t = TONO[e.tono];
              const on = actual === e.key;
              return (
                <button
                  key={e.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => aplicarEtiqueta(hoja.ids, e.key)}
                  className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left border transition-colors ${
                    on ? "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark" : "border-transparent hover:bg-surface dark:hover:bg-surface-dark"
                  }`}
                >
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${t.soft}`}>
                    <e.Icon className={`w-5 h-5 ${t.txt}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 flex-wrap text-sm font-medium text-titulo dark:text-titulo-dark">
                      {e.label} <RolPill etiqueta={e.key} responsabilidad={responsabilidad} />
                    </span>
                    <span className="block text-xs text-suave dark:text-suave-dark">{e.desc}</span>
                  </span>
                  {on && <HiCheck className="w-5 h-5 text-duo-violeta shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            {algunaConEtiqueta && (
              <button
                type="button"
                onClick={() => aplicarEtiqueta(hoja.ids, "")}
                className="flex-1 h-11 rounded-xl bg-surface dark:bg-surface-dark text-duo-rojo text-sm font-semibold"
              >
                Quitar etiqueta
              </button>
            )}
            <button
              type="button"
              onClick={cerrar}
              className="flex-1 h-11 rounded-xl bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-sm font-semibold"
            >
              {hoja.subida ? "Saltar" : "Cancelar"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ── Visor (foto en grande) ──────────────────────────────────────
  const renderVisor = () => {
    if (!visor || !fotoVisor) return null;
    const e = POR_KEY[fotoVisor.etiqueta];
    const rol = e ? rolDe(e.key, responsabilidad) : null;
    return (
      <motion.div
        key="visor"
        role="dialog"
        aria-modal="true"
        aria-label="Ver foto"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(ev) => ev.stopPropagation()}
        className="fixed inset-0 z-[200] bg-black flex flex-col text-white"
      >
        <div className="flex items-center gap-3 px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-2">
          <span className="text-sm text-white/75 tabular-nums">{visor.i + 1} de {visor.ids.length}</span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setVisor(null)}
            className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center"
            aria-label="Cerrar"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative flex-1 min-h-0 flex items-center justify-center px-3"
          onClick={() => setVisor(null)}
          onTouchStart={(ev) => { toqueX.current = ev.touches[0].clientX; }}
          onTouchEnd={(ev) => {
            if (toqueX.current == null) return;
            const dx = ev.changedTouches[0].clientX - toqueX.current;
            toqueX.current = null;
            if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
          }}
        >
          <motion.img
            key={fotoVisor.id}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={fotoVisor.url}
            alt={fotoVisor.nombre || "Foto"}
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(ev) => ev.stopPropagation()}
          />
          {visor.i > 0 && (
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); mover(-1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 flex items-center justify-center"
              aria-label="Anterior"
            >
              <HiChevronLeft className="w-6 h-6" />
            </button>
          )}
          {visor.i < visor.ids.length - 1 && (
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); mover(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 flex items-center justify-center"
              aria-label="Siguiente"
            >
              <HiChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2.5 flex-wrap px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          {e ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
              <span className={`h-2 w-2 rounded-full ${TONO[e.tono].dot}`} />
              {e.label}{rol ? ` · ${rol}` : ""}
            </span>
          ) : (
            <span className="text-sm text-white/70">Sin etiqueta</span>
          )}
          {puedeEtiquetar && (
            <button
              type="button"
              onClick={() => setHoja({ ids: [fotoVisor.id], subida: false })}
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-3.5 py-1.5 text-sm font-semibold"
            >
              <HiTag className="w-4 h-4" /> {e ? "Cambiar etiqueta" : "Etiquetar"}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Barra de selección ──────────────────────────────────────────
  const renderBarraSel = () => {
    if (!modoSel) return null;
    const n = seleccion.length;
    return (
      <motion.div
        key="barra"
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        onClick={(ev) => ev.stopPropagation()}
        className="fixed left-0 right-0 bottom-0 z-[190] bg-card dark:bg-card-dark border-t border-linea dark:border-linea-dark shadow-[0_-8px_24px_rgba(15,23,42,.12)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <span className="flex-1 text-sm font-semibold text-titulo dark:text-titulo-dark tabular-nums">
            {n ? `${n} seleccionada${n > 1 ? "s" : ""}` : "Tocá las fotos"}
          </span>
          <button
            type="button"
            onClick={salirSeleccion}
            className="h-10 px-4 rounded-xl bg-surface dark:bg-surface-dark text-sm font-semibold text-titulo dark:text-titulo-dark"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!n}
            onClick={() => setHoja({ ids: seleccion, subida: false })}
            className="h-10 px-4 rounded-xl bg-duo-violeta text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <HiTag className="w-4 h-4" /> Etiquetar
          </button>
        </div>
      </motion.div>
    );
  };

  const capa = (
    <>
      <AnimatePresence>{renderVisor()}</AnimatePresence>
      <AnimatePresence>{renderBarraSel()}</AnimatePresence>
      <AnimatePresence>{renderHoja()}</AnimatePresence>
    </>
  );

  return (
    <div className={compact ? "" : "p-4"}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <HiPhotograph className="w-5 h-5 text-duo-azul shrink-0" />
        <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Fotos del siniestro</h3>
        {fotos.length > 0 && (
          <span className="text-xs font-medium text-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 rounded-lg tabular-nums">
            {fotos.length}
          </span>
        )}
        <span className="flex-1" />
        {puedeEtiquetar && fotos.length > 1 && (
          <button
            type="button"
            onClick={() => (modoSel ? salirSeleccion() : setModoSel(true))}
            aria-pressed={modoSel}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
              modoSel
                ? "bg-duo-violeta border-duo-violeta text-white"
                : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
            }`}
          >
            {modoSel ? "Listo" : "Seleccionar"}
          </button>
        )}
      </div>

      {/* Botones: Sacar foto (cámara) + Elegir de galería */}
      {!readOnly && (
        <div className="flex gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-duo-azul border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiCamera className="text-2xl text-duo-azul" />
            )}
            <span className="text-[11px] font-medium text-titulo dark:text-titulo-dark">Sacar foto</span>
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta transition-colors disabled:opacity-50"
          >
            <HiPhotograph className="text-2xl text-duo-violeta" />
            <span className="text-[11px] font-medium text-titulo dark:text-titulo-dark">Elegir de galería</span>
          </button>
        </div>
      )}

      {/* Inputs ocultos */}
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" onChange={onCamara} className="hidden" />
      <input ref={galeriaRef} type="file" accept="image/*" multiple onChange={onGaleria} className="hidden" />

      {/* 🏷️ Filtros por etiqueta (solo si alguna foto tiene etiqueta) */}
      {!loading && hayEtiquetas && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Filtrar por etiqueta">
          {[{ key: "TODAS", label: "Todas", n: fotos.length }, ...ORDEN.filter((g) => conteo[g]).map((g) => ({
            key: g, label: g === SIN ? "Sin etiqueta" : POR_KEY[g].label, n: conteo[g],
          }))].map((c) => {
            const on = filtroOk === c.key;
            const e = POR_KEY[c.key];
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(c.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  on
                    ? "bg-titulo dark:bg-titulo-dark border-titulo dark:border-titulo-dark text-card dark:text-card-dark"
                    : `bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark ${c.key === SIN ? "border-dashed" : ""}`
                }`}
              >
                {e && <span className={`h-2 w-2 rounded-full ${TONO[e.tono].dot}`} />}
                {c.label}
                <span className={`tabular-nums ${on ? "opacity-70" : "text-suave dark:text-suave-dark"}`}>{c.n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grilla */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
        </div>
      ) : fotos.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-linea dark:border-linea-dark rounded-xl">
          <HiPhotograph className="w-9 h-9 text-suave dark:text-suave-dark mx-auto mb-2" />
          <p className="text-sm text-suave dark:text-suave-dark">
            {readOnly ? "Sin fotos" : "Todavía no agregaste fotos"}
          </p>
        </div>
      ) : !agrupar ? (
        <div className={gridClass}>
          <AnimatePresence initial={false}>{fotos.map(renderFoto)}</AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => {
            const e = POR_KEY[g.key];
            return (
              <section key={g.key}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {e ? (
                    <span className={`h-2 w-2 rounded-full ${TONO[e.tono].dot}`} />
                  ) : (
                    <span className="h-2 w-2 rounded-full border border-dashed border-suave dark:border-suave-dark" />
                  )}
                  <h4 className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">{e ? e.label : "Sin etiqueta"}</h4>
                  {e && <RolPill etiqueta={e.key} responsabilidad={responsabilidad} />}
                  <span className="text-xs text-suave dark:text-suave-dark tabular-nums">{g.fotos.length}</span>
                </div>
                <div className={gridClass}>
                  <AnimatePresence initial={false}>{g.fotos.map(renderFoto)}</AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Visor, hoja de etiquetas y barra de selección: van en el body */}
      {typeof document !== "undefined" ? createPortal(capa, document.body) : null}
    </div>
  );
}
