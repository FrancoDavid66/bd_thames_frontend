// src/components/balanzes/BalanzesSettingsModal.jsx  (diseño Duo)
import { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  HiSearch, HiPlus, HiPencil, HiTrash, HiCheck, HiX, HiFolderOpen, HiCog,
} from "react-icons/hi";
import {
  fetchCategorias,
  createCategoria,
  deleteCategoria,
} from "../../store/slices/balanceSlice";

export default function BalanzesSettingsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);
  const categoriasBackend = useSelector((s) => s.balance?.categorias || []);

  const [tab, setTab] = useState("INGRESO"); // INGRESO | EGRESO
  const [newCat, setNewCat] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  // edición / borrado por fila
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [busy, setBusy] = useState(false);

  // onClose puede cambiar de identidad en cada render del padre; lo guardamos
  // en un ref para que el efecto NO se reejecute (y no borre lo que escribís).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchCategorias()); // trae todas (con su tipo)
    setTab("INGRESO");
    setNewCat("");
    setQuery("");
    setEditId(null);
    setEditValue("");
    setConfirmDelId(null);

    const onKey = (e) => e.key === "Escape" && onCloseRef.current?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cantidad de usos de una categoría (en movimientos reales)
  const usoDe = (nombre) => {
    const n = (nombre || "").toLowerCase();
    const ing = ingresos.filter((i) => (i?.categoria || "").toLowerCase() === n).length;
    const eg = egresos.filter((e) => (e?.categoria || "").toLowerCase() === n).length;
    return ing + eg;
  };

  // Lista de la pestaña activa (incluye AMBOS y GENERAL para no esconder nada)
  const lista = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoriasBackend
      .filter((c) => c?.tipo === tab || c?.tipo === "AMBOS" || c?.tipo === "GENERAL")
      .filter((c) => !q || (c?.nombre || "").toLowerCase().includes(q))
      .sort((a, b) => (a?.nombre || "").localeCompare(b?.nombre || ""));
  }, [categoriasBackend, tab, query]);

  /* ----- acciones ----- */
  const addCat = async () => {
    const v = (newCat || "").trim();
    if (!v) return;
    setAdding(true);
    try {
      await dispatch(createCategoria({ nombre: v, tipo: tab })).unwrap();
      setNewCat("");
      dispatch(fetchCategorias());
    } catch { /* noop */ }
    finally { setAdding(false); }
  };

  const startEdit = (cat) => {
    setEditId(cat.id);
    setEditValue(cat.nombre || "");
    setConfirmDelId(null);
  };

  const saveEdit = async (cat) => {
    const v = (editValue || "").trim();
    if (!v || v === cat.nombre) { setEditId(null); return; }
    setBusy(true);
    try {
      // El backend no tiene "renombrar": creamos la nueva y borramos la vieja (mismo tipo)
      await dispatch(createCategoria({ nombre: v, tipo: cat.tipo || tab })).unwrap();
      if (cat.id) await dispatch(deleteCategoria(cat.id)).unwrap();
      dispatch(fetchCategorias());
    } catch { /* noop */ }
    finally { setBusy(false); setEditId(null); setEditValue(""); }
  };

  const removeCat = async (cat) => {
    setBusy(true);
    try {
      if (cat.id) await dispatch(deleteCategoria(cat.id)).unwrap();
      dispatch(fetchCategorias());
    } catch { /* noop */ }
    finally { setBusy(false); setConfirmDelId(null); }
  };

  if (!isOpen) return null;

  const inputCls =
    "flex-1 px-4 py-2.5 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-xs sm:text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none focus:border-oficina transition-colors";

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-end md:items-center justify-center p-2 sm:p-4">
        <div className="w-full md:w-[min(96vw,720px)] max-h-[92vh] rounded-t-3xl md:rounded-3xl shadow-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-oficina/15 flex items-center justify-center">
                <HiCog className="text-xl text-oficina" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base md:text-lg font-black tracking-tight">Categorías</h2>
                <p className="text-[11px] sm:text-xs font-bold text-suave dark:text-suave-dark">Las que aparecen al cargar ingresos y egresos</p>
              </div>
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:brightness-95 transition-colors">Cerrar</button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-auto min-h-0 space-y-4 text-xs sm:text-sm">
            {/* Tabs Ingreso / Egreso */}
            <div className="flex bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl p-1">
              <button
                onClick={() => { setTab("INGRESO"); setEditId(null); setConfirmDelId(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${tab === "INGRESO" ? "bg-ingreso/20 text-ingreso dark:text-ingreso-claro" : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
              >
                Categorías de Ingreso
              </button>
              <button
                onClick={() => { setTab("EGRESO"); setEditId(null); setConfirmDelId(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${tab === "EGRESO" ? "bg-egreso/20 text-egreso dark:text-egreso-claro" : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
              >
                Categorías de Egreso
              </button>
            </div>

            {/* Agregar + buscar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCat()}
                placeholder={tab === "INGRESO" ? "Nueva categoría de ingreso…" : "Nueva categoría de egreso…"}
                className={inputCls}
              />
              <button
                onClick={addCat}
                disabled={!newCat.trim() || adding}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all text-white ${
                  !newCat.trim() || adding
                    ? "bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark cursor-not-allowed"
                    : tab === "INGRESO"
                      ? "bg-ingreso shadow-[0_4px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5"
                      : "bg-egreso shadow-[0_4px_0_var(--color-egreso-fuerte)] active:shadow-[0_0_0_var(--color-egreso-fuerte)] active:translate-y-0.5"
                }`}
              >
                <HiPlus className="text-lg" /> Agregar
              </button>
            </div>

            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar categoría…"
                className="w-full pl-9 px-4 py-2.5 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-xs sm:text-sm font-bold placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none focus:border-oficina transition-colors"
              />
            </div>

            {/* Lista */}
            <div className="rounded-2xl border-2 border-linea dark:border-linea-dark max-h-[50vh] overflow-y-auto divide-y-2 divide-linea dark:divide-linea-dark bg-surface dark:bg-surface-dark">
              {lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-suave dark:text-suave-dark">
                  <HiFolderOpen className="text-4xl opacity-50" />
                  <p className="text-xs sm:text-sm font-bold">Sin categorías todavía</p>
                </div>
              ) : (
                lista.map((cat) => {
                  const editando = editId === cat.id;
                  const confirmando = confirmDelId === cat.id;
                  const esOtroTipo = cat.tipo !== tab; // AMBOS / GENERAL
                  return (
                    <div key={cat.id || cat.nombre} className="px-4 py-3 flex items-center gap-3">
                      {editando ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat); if (e.key === "Escape") setEditId(null); }}
                          className="flex-1 px-3 py-1.5 rounded-lg border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark text-sm font-bold focus:outline-none focus:border-oficina"
                        />
                      ) : (
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-black text-titulo dark:text-titulo-dark truncate">{cat.nombre}</span>
                          {esOtroTipo && (
                            <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark">{cat.tipo}</span>
                          )}
                          <span className="text-[10px] font-bold text-suave dark:text-suave-dark whitespace-nowrap">{usoDe(cat.nombre)} usos</span>
                        </div>
                      )}

                      {/* Acciones */}
                      {editando ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => saveEdit(cat)} disabled={busy} className="p-2 rounded-lg bg-ingreso hover:bg-ingreso-fuerte text-white"><HiCheck /></button>
                          <button onClick={() => setEditId(null)} className="p-2 rounded-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:brightness-95 text-suave dark:text-suave-dark"><HiX /></button>
                        </div>
                      ) : confirmando ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-black text-egreso dark:text-egreso-claro mr-1 hidden sm:inline">¿Borrar?</span>
                          <button onClick={() => removeCat(cat)} disabled={busy} className="p-2 rounded-lg bg-egreso hover:bg-egreso-fuerte text-white"><HiCheck /></button>
                          <button onClick={() => setConfirmDelId(null)} className="p-2 rounded-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:brightness-95 text-suave dark:text-suave-dark"><HiX /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(cat)} title="Renombrar" className="p-2 rounded-lg bg-card dark:bg-card-dark hover:brightness-95 text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark border-2 border-linea dark:border-linea-dark"><HiPencil /></button>
                          <button onClick={() => setConfirmDelId(cat.id)} title="Eliminar" className="p-2 rounded-lg bg-card dark:bg-card-dark hover:bg-egreso hover:text-white text-egreso border-2 border-egreso/30"><HiTrash /></button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[11px] font-bold text-suave dark:text-suave-dark">
              💡 Las <strong>billeteras / cuentas</strong> se administran desde <strong>Gerencia</strong>. Acá solo gestionás categorías.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
