// src/components/balanzes/BalanzesSettingsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiCheck,
  HiX,
  HiFolderOpen,
  HiCreditCard,
  HiCog,
  HiArrowLeft,
} from "react-icons/hi";
import {
  fetchCategorias,
  createCategoria,
  deleteCategoria,
} from "../../store/slices/balanceSlice";

/* Utils */
const uniqClean = (arr = []) =>
  Array.from(
    new Set(
      arr
        .map((x) => (x ?? "").toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

export default function BalanzesSettingsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos  = useSelector((s) => s.egresos?.list  || []);

  // Categorías desde Redux/backend
  const categoriasBackend = useSelector((s) => s.balance?.categorias || []);
  const cats = useMemo(
    () => uniqClean(categoriasBackend.map((c) => c?.nombre || c)),
    [categoriasBackend]
  );

  // Billeteras — siguen derivándose de los movimientos reales (no hay endpoint propio)
  const wallets = useMemo(() =>
    uniqClean([
      ...ingresos.filter(i => ["TRANSFERENCIA","MERCADOPAGO","VIRTUAL"].includes(i?.forma_pago)).map(i => i?.billetera),
      ...egresos.filter(e  => ["TRANSFERENCIA","MERCADOPAGO","VIRTUAL"].includes(e?.forma_pago)).map(e  => e?.billetera),
    ]), [ingresos, egresos]
  );

  /* ----- Paso actual: menu | cats | wallets ----- */
  const [step, setStep] = useState("menu");

  // inputs
  const [newCat,       setNewCat]       = useState("");
  const [catQuery,     setCatQuery]     = useState("");
  const [walletQuery,  setWalletQuery]  = useState("");

  // selección + edición
  const [selCat,        setSelCat]        = useState("");
  const [renameCat,     setRenameCat]     = useState("");
  const [confirmDelCat, setConfirmDelCat] = useState(false);
  const [savingCat,     setSavingCat]     = useState(false);

  /* ----- lifecycle ----- */
  useEffect(() => {
    if (!isOpen) return;

    // Cargar categorías desde el backend
    dispatch(fetchCategorias());

    // reset UI
    setStep("menu");
    setNewCat("");
    setCatQuery("");
    setWalletQuery("");
    setSelCat("");
    setRenameCat("");
    setConfirmDelCat(false);
    setSavingCat(false);

    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose, dispatch]);

  /* ----- stats / listas ----- */
  const catStats = useMemo(() => {
    const all = uniqClean([
      ...cats,
      ...ingresos.map((i) => i?.categoria),
      ...egresos.map((e) => e?.categoria),
    ]);
    const obj = {};
    all.forEach(
      (c) => (obj[c] = { nombre: c, ingresos: 0, egresos: 0, total: 0 })
    );
    ingresos.forEach((i) => {
      const k = i?.categoria || "";
      if (obj[k]) {
        obj[k].ingresos++;
        obj[k].total++;
      }
    });
    egresos.forEach((e) => {
      const k = e?.categoria || "";
      if (obj[k]) {
        obj[k].egresos++;
        obj[k].total++;
      }
    });
    return Object.values(obj).sort(
      (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre)
    );
  }, [cats, ingresos, egresos]);

  const walletStats = useMemo(() => {
    const all = uniqClean([
      ...wallets,
      ...ingresos
        .filter((i) => i?.forma_pago === "TRANSFERENCIA" || i?.forma_pago === "MERCADOPAGO" || i?.forma_pago === "VIRTUAL")
        .map((i) => i?.billetera), 
      ...egresos
        .filter((e) => e?.forma_pago === "TRANSFERENCIA" || e?.forma_pago === "MERCADOPAGO" || e?.forma_pago === "VIRTUAL")
        .map((e) => e?.billetera),
    ]);
    const obj = {};
    all.forEach(
      (w) => (obj[w] = { nombre: w, ingresos: 0, egresos: 0, total: 0 })
    );
    ingresos
      .filter((i) => i?.forma_pago === "TRANSFERENCIA" || i?.forma_pago === "MERCADOPAGO" || i?.forma_pago === "VIRTUAL")
      .forEach((i) => {
        const k = i?.billetera || "";
        if (obj[k]) {
          obj[k].ingresos++;
          obj[k].total++;
        }
      });
    egresos
      .filter((e) => e?.forma_pago === "TRANSFERENCIA" || e?.forma_pago === "MERCADOPAGO" || e?.forma_pago === "VIRTUAL")
      .forEach((e) => {
        const k = e?.billetera || "";
        if (obj[k]) {
          obj[k].egresos++;
          obj[k].total++;
        }
      });
    return Object.values(obj).sort(
      (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre)
    );
  }, [wallets, ingresos, egresos]);

  const filteredCatStats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return catStats;
    return catStats.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [catStats, catQuery]);

  const filteredWalletStats = useMemo(() => {
    const q = walletQuery.trim().toLowerCase();
    if (!q) return walletStats;
    return walletStats.filter((w) => w.nombre.toLowerCase().includes(q));
  }, [walletStats, walletQuery]);

  const top = (arr) =>
    arr
      .slice(0, 3)
      .map((x) => x.nombre || x)
      .filter(Boolean);

  /* ----- actions categorías — ahora van al backend via Redux ----- */
  const addCat = async () => {
    const v = (newCat || "").trim();
    if (!v) return;
    setSavingCat(true);
    try {
      await dispatch(createCategoria({ nombre: v, tipo: "GENERAL" })).unwrap();
      setNewCat("");
      dispatch(fetchCategorias());
    } catch { /* toast si querés */ }
    finally { setSavingCat(false); }
  };

  const doRenameCat = async () => {
    const v = (renameCat || "").trim();
    if (!selCat || !v) return;
    // El backend no tiene endpoint de rename aún — creamos la nueva y borramos la vieja
    setSavingCat(true);
    try {
      await dispatch(createCategoria({ nombre: v, tipo: "GENERAL" })).unwrap();
      const catObj = categoriasBackend.find(c => (c?.nombre || c) === selCat);
      if (catObj?.id) await dispatch(deleteCategoria(catObj.id)).unwrap();
      setSelCat(v);
      setRenameCat("");
      dispatch(fetchCategorias());
    } catch {}
    finally { setSavingCat(false); }
  };

  const removeCat = async () => {
    if (!selCat) return;
    setSavingCat(true);
    try {
      const catObj = categoriasBackend.find(c => (c?.nombre || c) === selCat);
      if (catObj?.id) await dispatch(deleteCategoria(catObj.id)).unwrap();
      setSelCat("");
      setConfirmDelCat(false);
      dispatch(fetchCategorias());
    } catch {}
    finally { setSavingCat(false); }
  };

  /* ----- UI helpers ----- */
  const EmptyState = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-zinc-500">
      <Icon className="text-4xl opacity-50" />
      <p className="text-xs sm:text-sm font-medium">{label}</p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="absolute inset-0 flex items-end md:items-center justify-center p-2 sm:p-4">
        <div className="w-full md:w-[min(96vw,1000px)] max-h-[92vh] rounded-t-3xl md:rounded-3xl shadow-2xl border border-zinc-800 bg-zinc-950 text-zinc-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-3">
              {step !== "menu" ? (
                <button
                  onClick={() => setStep("menu")}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Volver al menú"
                >
                  <HiArrowLeft className="text-lg" />
                </button>
              ) : null}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/80 via-purple-500/40 to-fuchsia-400/60 flex items-center justify-center shadow-inner">
                <HiCog className="text-xl text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-base md:text-lg font-bold tracking-tight">
                  Configuración de Balances
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-400">
                  Ajustá categorías y billeteras de uso frecuente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              Cerrar
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-auto min-h-0 space-y-5 text-xs sm:text-sm">
            <p className="text-[11px] sm:text-xs text-zinc-400 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
              Gestioná las <strong>sugerencias rápidas</strong> que aparecen al
              crear o editar movimientos. Los cambios aquí <em>no</em> modifican registros ya guardados en la base de datos.
            </p>

            {/* -------- MENU DE OPCIONES -------- */}
            {step === "menu" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Categorías */}
                <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                        <HiFolderOpen className="text-xl text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold text-zinc-100">
                        Categorías
                      </h3>
                    </div>
                    <p className="text-[11px] sm:text-xs text-zinc-400 min-h-[32px]">
                      Creá, renombrá o eliminá las categorías en las que clasificás el dinero.
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[28px]">
                      {top(catStats).length ? (
                        top(catStats).map((c) => (
                          <span
                            key={c}
                            className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-300"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-zinc-600 italic">
                          Sin datos aún
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-800/50">
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {
                          uniqClean([
                            ...cats,
                            ...ingresos.map((i) => i?.categoria),
                            ...egresos.map((e) => e?.categoria),
                          ]).length
                        }{" "}
                        registradas
                      </span>
                      <button
                        onClick={() => setStep("cats")}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-500 transition-transform active:scale-95"
                      >
                        Configurar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Billeteras */}
                <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                        <HiCreditCard className="text-xl text-sky-400" />
                      </div>
                      <h3 className="text-base font-bold text-zinc-100">
                        Billeteras / Cuentas
                      </h3>
                    </div>
                    <p className="text-[11px] sm:text-xs text-zinc-400 min-h-[32px]">
                      Administrá los nombres de bancos o billeteras para transferencias.
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[28px]">
                      {top(walletStats).length ? (
                        top(walletStats).map((w) => (
                          <span
                            key={w}
                            className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-300"
                          >
                            {w}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-zinc-600 italic">
                          Sin datos aún
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-zinc-800/50">
                      <span className="text-[11px] text-zinc-500 font-medium">
                        {
                          uniqClean([
                            ...wallets,
                            ...ingresos
                              .filter((i) => i?.forma_pago === "TRANSFERENCIA" || i?.forma_pago === "MERCADOPAGO" || i?.forma_pago === "VIRTUAL")
                              .map((i) => i?.billetera),
                            ...egresos
                              .filter((e) => e?.forma_pago === "TRANSFERENCIA" || e?.forma_pago === "MERCADOPAGO" || e?.forma_pago === "VIRTUAL")
                              .map((e) => e?.billetera),
                          ]).length
                        }{" "}
                        registradas
                      </span>
                      <button
                        onClick={() => setStep("wallets")}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-900 bg-sky-400 hover:bg-sky-500 transition-transform active:scale-95"
                      >
                        Configurar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------- DETALLE: CATEGORÍAS -------- */}
            {step === "cats" && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
                    <input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCat()}
                      placeholder="Nueva categoría (ej: Insumos)…"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow"
                    />
                    <button
                      onClick={addCat}
                      disabled={!newCat.trim()}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        !newCat.trim()
                          ? "bg-emerald-500/20 text-emerald-100/30 cursor-not-allowed border border-emerald-500/10"
                          : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      }`}
                    >
                      <HiPlus className="text-lg" /> Agregar
                    </button>
                  </div>
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg" />
                    <input
                      value={catQuery}
                      onChange={(e) => setCatQuery(e.target.value)}
                      placeholder="Buscar categoría…"
                      className="w-full pl-9 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-zinc-800 max-h-[50vh] overflow-y-auto overflow-x-hidden divide-y divide-zinc-800/50 bg-zinc-950 custom-scrollbar">
                      {filteredCatStats.length ? (
                        filteredCatStats.map((r) => (
                          <button
                            key={r.nombre}
                            type="button"
                            onClick={() => {
                              setSelCat(r.nombre);
                              setRenameCat("");
                              setConfirmDelCat(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors text-xs sm:text-sm group ${
                              selCat === r.nombre
                                ? "bg-zinc-800/80 border-l-2 border-emerald-400"
                                : "hover:bg-zinc-900 border-l-2 border-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                                {r.nombre}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 whitespace-nowrap">
                                {r.total} usos (In: {r.ingresos} / Eg: {r.egresos})
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <EmptyState
                          icon={HiFolderOpen}
                          label="No se encontraron categorías"
                        />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-950 space-y-4 shadow-sm">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                        Editor de Categoría
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 ml-1">Selección actual</label>
                        <input
                          disabled
                          value={selCat || ""}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs sm:text-sm text-zinc-300 font-medium"
                          placeholder="Ninguna"
                        />
                      </div>
                      
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] text-emerald-400 ml-1">Nuevo nombre</label>
                        <input
                          value={renameCat}
                          onChange={(e) => setRenameCat(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && doRenameCat()}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                          placeholder="Escribí el nuevo nombre…"
                        />
                      </div>
                      
                      <button
                        onClick={doRenameCat}
                        disabled={!selCat || !renameCat.trim()}
                        className={`w-full py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          !selCat || !renameCat.trim()
                            ? "bg-emerald-500/10 text-emerald-500/50 cursor-not-allowed border border-emerald-500/10"
                            : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                        }`}
                      >
                        <HiPencil className="text-base" /> Renombrar
                      </button>

                      <div className="border-t border-zinc-800/80 pt-4 mt-2">
                        {!confirmDelCat ? (
                          <button
                            onClick={() => setConfirmDelCat(true)}
                            disabled={!selCat}
                            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                              !selCat
                                ? "bg-rose-500/10 text-rose-500/40 cursor-not-allowed border border-rose-500/10"
                                : "bg-zinc-900 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30"
                            }`}
                          >
                            <HiTrash className="text-base" /> Eliminar categoría
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <span className="text-[11px] text-rose-300 font-medium text-center">
                              ¿Eliminar "{selCat}" de la lista?
                            </span>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={removeCat}
                                className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-semibold flex items-center justify-center gap-1 hover:bg-rose-500 text-xs"
                              >
                                <HiCheck /> Sí
                              </button>
                              <button
                                onClick={() => setConfirmDelCat(false)}
                                className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium flex items-center justify-center gap-1 hover:bg-zinc-700 text-xs"
                              >
                                <HiX /> No
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* -------- DETALLE: BILLETERAS -------- */}
            {step === "wallets" && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
                    <input
                      value={newWallet}
                      onChange={(e) => setNewWallet(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addWallet()}
                      placeholder="Nueva billetera (ej: MercadoPago)…"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-shadow"
                    />
                    <button
                      onClick={addWallet}
                      disabled={!newWallet.trim()}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        !newWallet.trim()
                          ? "bg-sky-500/20 text-sky-100/30 cursor-not-allowed border border-sky-500/10"
                          : "bg-sky-500 text-white hover:bg-sky-600"
                      }`}
                    >
                      <HiPlus className="text-lg" /> Agregar
                    </button>
                  </div>
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg" />
                    <input
                      value={walletQuery}
                      onChange={(e) => setWalletQuery(e.target.value)}
                      placeholder="Buscar billetera…"
                      className="w-full pl-9 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-zinc-800 max-h-[50vh] overflow-y-auto overflow-x-hidden divide-y divide-zinc-800/50 bg-zinc-950 custom-scrollbar">
                      {filteredWalletStats.length ? (
                        filteredWalletStats.map((r) => (
                          <button
                            key={r.nombre}
                            type="button"
                            onClick={() => {
                              setSelWallet(r.nombre);
                              setRenameWallet("");
                              setConfirmDelWallet(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors text-xs sm:text-sm group ${
                              selWallet === r.nombre
                                ? "bg-zinc-800/80 border-l-2 border-sky-400"
                                : "hover:bg-zinc-900 border-l-2 border-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                                {r.nombre}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 whitespace-nowrap">
                                {r.total} usos (In: {r.ingresos} / Eg: {r.egresos})
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <EmptyState
                          icon={HiCreditCard}
                          label="No se encontraron billeteras"
                        />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-950 space-y-4 shadow-sm">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                        Editor de Billetera
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 ml-1">Selección actual</label>
                        <input
                          disabled
                          value={selWallet || ""}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs sm:text-sm text-zinc-300 font-medium"
                          placeholder="Ninguna"
                        />
                      </div>
                      
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] text-sky-400 ml-1">Nuevo nombre</label>
                        <input
                          value={renameWallet}
                          onChange={(e) => setRenameWallet(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && doRenameWallet()
                          }
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                          placeholder="Escribí el nuevo nombre…"
                        />
                      </div>
                      
                      <button
                        onClick={doRenameWallet}
                        disabled={!selWallet || !renameWallet.trim()}
                        className={`w-full py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          !selWallet || !renameWallet.trim()
                            ? "bg-sky-500/10 text-sky-500/50 cursor-not-allowed border border-sky-500/10"
                            : "bg-sky-500 text-white hover:bg-sky-400"
                        }`}
                      >
                        <HiPencil className="text-base" /> Renombrar
                      </button>

                      <div className="border-t border-zinc-800/80 pt-4 mt-2">
                        {!confirmDelWallet ? (
                          <button
                            onClick={() => setConfirmDelWallet(true)}
                            disabled={!selWallet}
                            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                              !selWallet
                                ? "bg-rose-500/10 text-rose-500/40 cursor-not-allowed border border-rose-500/10"
                                : "bg-zinc-900 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30"
                            }`}
                          >
                            <HiTrash className="text-base" /> Eliminar billetera
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <span className="text-[11px] text-rose-300 font-medium text-center">
                              ¿Eliminar "{selWallet}" de la lista?
                            </span>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={removeWallet}
                                className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-semibold flex items-center justify-center gap-1 hover:bg-rose-500 text-xs"
                              >
                                <HiCheck /> Sí
                              </button>
                              <button
                                onClick={() => setConfirmDelWallet(false)}
                                className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium flex items-center justify-center gap-1 hover:bg-zinc-700 text-xs"
                              >
                                <HiX /> No
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}