import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import { HiCog } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import { fetchBalanceDiario } from "../store/slices/balanceSlice";

import IngresoCreateModal from "../components/balanzes/IngresoCreateModal";
import EgresoCreateModal from "../components/balanzes/EgresoCreateModal";
import IngresoTable from "../components/balanzes/IngresoTable";
import EgresoTable from "../components/balanzes/EgresoTable";

import BalanceDateFilter from "../components/balanzes/BalanceDateFilter";
import EnviarBalanceDiarioButton from "../components/balanzes/EnviarBalanceDiarioButton";
import BalanceChart from "../components/balanzes/BalanceChart";
import BalanceExportPanel from "../components/balanzes/BalanceExportPanel";
import BalanzesSettingsModal from "../components/balanzes/BalanzesSettingsModal";

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* KPI card simple (mismos colores: verde ingresos / rojo egresos / azul balance) */
function KpiCard({ title, value, hint, variant = "blue" }) {
  const variants = {
    green: "bg-emerald-600/20 border border-emerald-500/30 text-white",
    red: "bg-red-600/20 border border-red-500/30 text-white",
    blue: "bg-blue-600/20 border border-blue-500/30 text-white",
  };
  return (
    <div className={`${variants[variant]} p-4 rounded-xl shadow-sm`}>
      <h3 className="text-xs md:text-sm opacity-80">{title}</h3>
      <p className="text-2xl md:text-3xl font-extrabold mt-1">
        ${fmtMoney(value)}
      </p>
      {hint ? <p className="text-xs mt-1 opacity-70">{hint}</p> : null}
    </div>
  );
}

const BalancesPage = () => {
  const dispatch = useDispatch();

  // listas crudas
  const { list: ingresos = [], status: ingresosStatus } = useSelector((s) => s.ingresos || {});
  const { list: egresos = [], status: egresosStatus } = useSelector((s) => s.egresos || {});

  // datos del balance diario (GET backend)
  const balanceState = useSelector((s) => s.balance || {});
  const balanceData = balanceState?.data;
  const balanceStatus = balanceState?.status;

  // fecha seleccionada (AR)
  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));

  // modales
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // cargar tablas base (una vez)
  useEffect(() => {
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
  }, [dispatch]);

  // consultar balance diario (GET) cuando cambia la fecha
  useEffect(() => {
    dispatch(fetchBalanceDiario({ fecha }));
  }, [dispatch, fecha]);

  // Totales del mes (local)
  const hoy = useMemo(() => dayjs(), []);
  const mesActual = hoy.month();
  const anioActual = hoy.year();

  const ingresosMensuales = useMemo(
    () =>
      ingresos.filter((i) => {
        const f = dayjs(i.fecha);
        return f.month() === mesActual && f.year() === anioActual;
      }),
    [ingresos, mesActual, anioActual]
  );

  const egresosMensuales = useMemo(
    () =>
      egresos.filter((e) => {
        const f = dayjs(e.fecha);
        return f.month() === mesActual && f.year() === anioActual;
      }),
    [egresos, mesActual, anioActual]
  );

  const totalIngresosMensuales = useMemo(
    () => ingresosMensuales.reduce((acc, i) => acc + toNumber(i.monto), 0),
    [ingresosMensuales]
  );
  const totalEgresosMensuales = useMemo(
    () => egresosMensuales.reduce((acc, e) => acc + toNumber(e.monto), 0),
    [egresosMensuales]
  );

  // Totales diarios (desde API)
  const tIn = toNumber(balanceData?.totales?.ingresos);
  const tEg = toNumber(balanceData?.totales?.egresos);
  const tBal = toNumber(balanceData?.totales?.balance);

  const cargando =
    ingresosStatus === "loading" ||
    egresosStatus === "loading" ||
    balanceStatus === "loading";

  return (
    <div className="p-4 md:p-6 text-zinc-800 dark:text-white">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Resumen de Balances</h1>
          <p className="text-sm opacity-70">
            Mes: <strong>{dayjs().format("MMMM YYYY")}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BalanceDateFilter value={fecha} onChange={setFecha} />
          {/* Enviar usa POST y manda la fecha seleccionada */}
          <EnviarBalanceDiarioButton fecha={fecha} />

          {/* Botón de configuración (categorías y billeteras) */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Configuración (categorías y billeteras)"
            aria-label="Abrir configuración"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <HiCog className="text-xl" />
          </button>
        </div>
      </div>

      {/* KPIs del día (API) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard
          title={`Ingresos del día (${dayjs(fecha).format("DD/MM/YYYY")})`}
          value={tIn}
          variant="green"
        />
        <KpiCard
          title={`Egresos del día (${dayjs(fecha).format("DD/MM/YYYY")})`}
          value={tEg}
          variant="red"
        />
        <KpiCard title="Balance del día" value={tBal} variant="blue" />
      </div>

      {/* Gráfico (últimos 7/30 días o 12 meses) */}
      <BalanceChart ingresos={ingresos} egresos={egresos} className="mb-6" />

      {/* Totales del mes (local) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-green-600 dark:bg-green-700 text-white p-4 rounded-xl shadow-sm">
          <h3 className="text-sm opacity-90">Ingresos del mes</h3>
          <p className="text-2xl md:text-3xl font-extrabold mt-1">
            ${fmtMoney(totalIngresosMensuales)}
          </p>
        </div>
        <div className="bg-red-600 dark:bg-red-700 text-white p-4 rounded-xl shadow-sm">
          <h3 className="text-sm opacity-90">Egresos del mes</h3>
          <p className="text-2xl md:text-3xl font-extrabold mt-1">
            ${fmtMoney(totalEgresosMensuales)}
          </p>
        </div>
        <div className="bg-blue-600/20 border border-blue-500/30 text-white p-4 rounded-xl shadow-sm">
          <h3 className="text-sm opacity-90">Resultado del mes</h3>
          <p
            className={`text-2xl md:text-3xl font-extrabold mt-1 ${
              totalIngresosMensuales - totalEgresosMensuales >= 0
                ? "text-blue-200"
                : "text-red-300"
            }`}
          >
            ${fmtMoney(totalIngresosMensuales - totalEgresosMensuales)}
          </p>
        </div>
      </div>

      {/* Exportación (Excel, con datos visibles del mes) */}
      <BalanceExportPanel
        ingresos={ingresosMensuales}
        egresos={egresosMensuales}
        fileName={`Balance_${dayjs().format("YYYY-MM")}.xlsx`}
        className="mb-6"
      />

      {/* Acciones rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setModalIngresoAbierto(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition"
          >
            <FaPlus /> Nuevo ingreso
          </button>
          <button
            onClick={() => setModalEgresoAbierto(true)}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
          >
            <FaPlus /> Nuevo egreso
          </button>
        </div>
        {cargando ? <span className="text-xs opacity-70">Cargando movimientos…</span> : null}
      </div>

      {/* Tablas del mes */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Ingresos del mes</h2>
        </div>
        <IngresoTable ingresos={ingresosMensuales} />
        <div>
          <h2 className="text-lg font-semibold mb-2">Egresos del mes</h2>
        </div>
        <EgresoTable egresos={egresosMensuales} />
      </section>

      {/* Modales */}
      <IngresoCreateModal
        isOpen={modalIngresoAbierto}
        onClose={() => setModalIngresoAbierto(false)}
      />
      <EgresoCreateModal
        isOpen={modalEgresoAbierto}
        onClose={() => setModalEgresoAbierto(false)}
      />
      <BalanzesSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default BalancesPage;
