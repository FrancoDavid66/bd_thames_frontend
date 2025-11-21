// src/components/balanzes/BalanzesSettingsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
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

/* LocalStorage keys */
const STORAGE_CATS = "balanzes_categorias";
const STORAGE_WALLETS = "balanzes_billeteras";

/* Utils */
const uniqClean = (arr = []) =>
  Array.from(new Set(arr.map((x) => (x ?? "").toString().trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
const readLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export default function BalanzesSettingsModal({ isOpen, onClose }) {
  const ingresos = useSelector((s) => s.ingresos?.list || []);
  const egresos = useSelector((s) => s.egresos?.list || []);

  /* ----- Paso actual: menu | cats | wallets ----- */
  const [step, setStep] = useState("menu");

  /* ----- estado ----- */
  const [cats, setCats] = useState([]);
  const [wallets, setWallets] = useState([]);

  // inputs
  const [newCat, setNewCat] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [walletQuery, setWalletQuery] = useState("");

  // selección + edición
  const [selCat, setSelCat] = useState("");
  const [renameCat, setRenameCat] = useState("");
  const [confirmDelCat, setConfirmDelCat] = useState(false);

  const [selWallet, setSelWallet] = useState("");
  const [renameWallet, setRenameWallet] = useState("");
  const [confirmDelWallet, setConfirmDelWallet] = useState(false);

  /* ----- lifecycle ----- */
  useEffect(() => {
    if (!isOpen) return;
    setCats(readLS(STORAGE_CATS, []));
    setWallets(readLS(STORAGE_WALLETS, []));
    // reset UI
    setStep("menu");
    setNewCat("");
    setNewWallet("");
    setCatQuery("");
    setWalletQuery("");
    setSelCat("");
    setRenameCat("");
    setConfirmDelCat(false);
    setSelWallet("");
    setRenameWallet("");
    setConfirmDelWallet(false);
    // Esc y bloqueo scroll
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  useEffect(() => writeLS(STORAGE_CATS, cats), [cats]);
  useEffect(() => writeLS(STORAGE_WALLETS, wallets), [wallets]);

  /* ----- stats / listas ----- */
  const catStats = useMemo(() => {
    const all = uniqClean([
      ...cats,
      ...ingresos.map((i) => i?.categoria),
      ...egresos.map((e) => e?.categoria),
    ]);
    const obj = {};
    all.forEach((c) => (obj[c] = { nombre: c, ingresos: 0, egresos: 0, total: 0 }));
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
    return Object.values(obj).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  }, [cats, ingresos, egresos]);

  const walletStats = useMemo(() => {
    const all = uniqClean([
      ...wallets,
      ...ingresos.filter((i) => i?.forma_pago === "VIRTUAL").map((i) => i?.billetera),
      ...egresos.filter((e) => e?.forma_pago === "VIRTUAL").map((e) => e?.billetera),
    ]);
    const obj = {};
    all.forEach((w) => (obj[w] = { nombre: w, ingresos: 0, egresos: 0, total: 0 }));
    ingresos
      .filter((i) => i?.forma_pago === "VIRTUAL")
      .forEach((i) => {
        const k = i?.billetera || "";
        if (obj[k]) {
          obj[k].ingresos++;
          obj[k].total++;
        }
      });
    egresos
      .filter((e) => e?.forma_pago === "VIRTUAL")
      .forEach((e) => {
        const k = e?.billetera || "";
        if (obj[k]) {
          obj[k].egresos++;
          obj[k].total++;
        }
      });
    return Object.values(obj).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
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

  const top = (arr) => arr.slice(0, 3).map((x) => x.nombre || x).filter(Boolean);

  /* ----- actions categorías ----- */
  const addCat = () => {
    const v = (newCat || "").trim();
    if (!v) return;
    setCats((prev) => uniqClean([...prev, v]));
    setNewCat("");
  };
  const doRenameCat = () => {
    const v = (renameCat || "").trim();
    if (!selCat || !v) return;
    setCats((prev) => uniqClean(prev.map((c) => (c === selCat ? v : c))));
    setSelCat(v);
    setRenameCat("");
  };
  const removeCat = () => {
    if (!selCat) return;
    setCats((prev) => prev.filter((c) => c !== selCat));
    setSelCat("");
    setConfirmDelCat(false);
  };

  /* ----- actions billeteras ----- */
  const addWallet = () => {
    const v = (newWallet || "").trim();
    if (!v) return;
    setWallets((prev) => uniqClean([...prev, v]));
    setNewWallet("");
  };
  const doRenameWallet = () => {
    const v = (renameWallet || "").trim();
    if (!selWallet || !v) return;
    setWallets((prev) => uniqClean(prev.map((w) => (w === selWallet ? v : w))));
    setSelWallet(v);
    setRenameWallet("");
  };
  const removeWallet = () => {
    if (!selWallet) return;
    setWallets((prev) => prev.filter((w) => w !== selWallet));
    setSelWallet("");
    setConfirmDelWallet(false);
  };

  /* ----- UI helpers ----- */
  const EmptyState = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-zinc-500">
      <Icon className="text-3xl opacity-70" />
      <p className="text-sm">{label}</p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-[min(96vw,1100px)] max-h-[90vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {step !== "menu" ? (
                <button
                  onClick={() => setStep("menu")}
                  className="mr-1 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  title="Volver al menú"
                >
                  <HiArrowLeft />
                </button>
              ) : null}
              <HiCog className="text-xl opacity-80" />
              <h2 className="text-lg md:text-xl font-extrabold">
                Configuración de balanzes
              </h2>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            >
              Cerrar
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-auto min-h-0 space-y-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Gestioná las <strong>sugerencias</strong> que aparecen al crear/editar movimientos.
              Esto <em>no</em> modifica registros ya guardados.
            </p>

            {/* -------- MENU DE OPCIONES -------- */}
            {step === "menu" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categorías */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HiFolderOpen className="text-xl" />
                    <h3 className="text-base font-bold">Categorías</h3>
                  </div>
                  <p className="text-sm opacity-80 mb-3">
                    Crea, renombrá o eliminá categorías que usás seguido.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {top(catStats).length ? (
                      top(catStats).map((c) => (
                        <span key={c} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-xs">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs opacity-60">Sin datos aún</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">
                      {uniqClean([
                        ...cats,
                        ...ingresos.map((i) => i?.categoria),
                        ...egresos.map((e) => e?.categoria),
                      ]).length} totales
                    </span>
                    <button
                      onClick={() => setStep("cats")}
                      className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Configurar
                    </button>
                  </div>
                </div>

                {/* Billeteras */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HiCreditCard className="text-xl" />
                    <h3 className="text-base font-bold">Billeteras / Cuentas</h3>
                  </div>
                  <p className="text-sm opacity-80 mb-3">
                    Administrá opciones de pago para movimientos virtuales.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {top(walletStats).length ? (
                      top(walletStats).map((w) => (
                        <span key={w} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-xs">
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs opacity-60">Sin datos aún</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">
                      {uniqClean([
                        ...wallets,
                        ...ingresos.filter((i) => i?.forma_pago === "VIRTUAL").map((i) => i?.billetera),
                        ...egresos.filter((e) => e?.forma_pago === "VIRTUAL").map((e) => e?.billetera),
                      ]).length} totales
                    </span>
                    <button
                      onClick={() => setStep("wallets")}
                      className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------- DETALLE: CATEGORÍAS -------- */}
            {step === "cats" && (
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/40 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 flex gap-2">
                    <input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCat()}
                      placeholder="Agregar categoría…"
                      className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800"
                    />
                    <button
                      onClick={addCat}
                      disabled={!newCat.trim()}
                      className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                        !newCat.trim()
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      <HiPlus /> Agregar
                    </button>
                  </div>
                  <div className="relative">
                    <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
                    <input
                      value={catQuery}
                      onChange={(e) => setCatQuery(e.target.value)}
                      placeholder="Buscar…"
                      className="w-full pl-8 p-2 border rounded bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
                  <div className="2xl:col-span-2">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 max-h-[55vh] overflow-auto divide-y divide-zinc-200 dark:divide-zinc-800">
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
                            className={`w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                              selCat === r.nombre ? "bg-zinc-100 dark:bg-zinc-800" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{r.nombre}</span>
                              <span className="text-xs opacity-70">
                                {r.total} usos · In:{r.ingresos}/Eg:{r.egresos}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <EmptyState icon={HiFolderOpen} label="Sin categorías todavía" />
                      )}
                    </div>
                  </div>

                  <div className="2xl:col-span-1">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-950/40 space-y-3">
                      <div className="text-sm opacity-80">Detalle</div>
                      <input
                        disabled
                        value={selCat || ""}
                        className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800"
                        placeholder="Seleccioná una categoría"
                      />
                      <div className="flex gap-2">
                        <input
                          value={renameCat}
                          onChange={(e) => setRenameCat(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && doRenameCat()}
                          className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800"
                          placeholder="Renombrar a…"
                        />
                        <button
                          onClick={doRenameCat}
                          disabled={!selCat || !renameCat.trim()}
                          className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                            !selCat || !renameCat.trim()
                              ? "bg-blue-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          <HiPencil /> Renombrar
                        </button>
                      </div>

                      {!confirmDelCat ? (
                        <button
                          onClick={() => setConfirmDelCat(true)}
                          disabled={!selCat}
                          className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                            !selCat ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          <HiTrash /> Eliminar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">¿Eliminar “{selCat}”?</span>
                          <button
                            onClick={removeCat}
                            className="px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1 hover:bg-red-700"
                          >
                            <HiCheck /> Sí
                          </button>
                          <button
                            onClick={() => setConfirmDelCat(false)}
                            className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center gap-1 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                          >
                            <HiX /> No
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* -------- DETALLE: BILLETERAS -------- */}
            {step === "wallets" && (
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/40 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 flex gap-2">
                    <input
                      value={newWallet}
                      onChange={(e) => setNewWallet(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addWallet()}
                      placeholder="Agregar billetera / cuenta…"
                      className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800"
                    />
                    <button
                      onClick={addWallet}
                      disabled={!newWallet.trim()}
                      className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                        !newWallet.trim()
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      <HiPlus /> Agregar
                    </button>
                  </div>
                  <div className="relative">
                    <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
                    <input
                      value={walletQuery}
                      onChange={(e) => setWalletQuery(e.target.value)}
                      placeholder="Buscar…"
                      className="w-full pl-8 p-2 border rounded bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
                  <div className="2xl:col-span-2">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 max-h-[55vh] overflow-auto divide-y divide-zinc-200 dark:divide-zinc-800">
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
                            className={`w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                              selWallet === r.nombre ? "bg-zinc-100 dark:bg-zinc-800" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{r.nombre}</span>
                              <span className="text-xs opacity-70">
                                {r.total} usos · In:{r.ingresos}/Eg:{r.egresos}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <EmptyState icon={HiCreditCard} label="Sin billeteras todavía" />
                      )}
                    </div>
                  </div>

                  <div className="2xl:col-span-1">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-950/40 space-y-3">
                      <div className="text-sm opacity-80">Detalle</div>
                      <input
                        disabled
                        value={selWallet || ""}
                        className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800"
                        placeholder="Seleccioná una billetera"
                      />
                      <div className="flex gap-2">
                        <input
                          value={renameWallet}
                          onChange={(e) => setRenameWallet(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && doRenameWallet()}
                          className="flex-1 p-2 border rounded bg-white dark:bg-zinc-800"
                          placeholder="Renombrar a…"
                        />
                        <button
                          onClick={doRenameWallet}
                          disabled={!selWallet || !renameWallet.trim()}
                          className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                            !selWallet || !renameWallet.trim()
                              ? "bg-blue-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          <HiPencil /> Renombrar
                        </button>
                      </div>

                      {!confirmDelWallet ? (
                        <button
                          onClick={() => setConfirmDelWallet(true)}
                          disabled={!selWallet}
                          className={`px-3 py-2 rounded text-white flex items-center gap-1 ${
                            !selWallet ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          <HiTrash /> Eliminar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">¿Eliminar “{selWallet}”?</span>
                          <button
                            onClick={removeWallet}
                            className="px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1 hover:bg-red-700"
                          >
                            <HiCheck /> Sí
                          </button>
                          <button
                            onClick={() => setConfirmDelWallet(false)}
                            className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center gap-1 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                          >
                            <HiX /> No
                          </button>
                        </div>
                      )}
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
