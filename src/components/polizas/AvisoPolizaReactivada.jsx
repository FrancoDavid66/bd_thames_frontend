// src/components/polizas/AvisoPolizaReactivada.jsx
// ============================================================
// ⚠️ CARTEL: "ESTA PÓLIZA ESTABA DADA DE BAJA"
//
// Aparece apenas se termina de cobrar una cuota de una póliza que estaba
// CANCELADA (de cualquier pantalla: Pagos, ficha del cliente, ficha de la
// póliza, Panel Portal…). El backend ya la volvió a dejar viva; el cartel le
// recuerda a la oficina que llame / entre a la compañía a confirmar que allá
// también siga activa.
//
//   Ej: Sofi cobra la cuota 3 de Juan (dado de baja el 17/09)
//       → "Esta póliza estaba dada de baja · Verificá en NRE si sigue activa"
//
// Se monta UNA vez en App.jsx. Escucha el evento que dispara
// utils/pagos/avisoReactivacion.js. Si se cobran varias seguidas, las muestra
// de a una.
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { HiExclamation } from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { EVENTO_POLIZA_REACTIVADA } from "../../utils/pagos/avisoReactivacion";
import { fetchPolizaPorId } from "../../store/slices/polizasSlice";

const ESTADO_TEXTO = {
  activa: "ACTIVA",
  vencida: "EN MORA",
  finalizada: "FINALIZADA",
  cancelada: "DADA DE BAJA",
};

const fmtFecha = (iso) => {
  if (!iso) return "";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
};

export default function AvisoPolizaReactivada() {
  const [cola, setCola] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const alRecibir = (ev) => {
      const r = ev?.detail;
      if (!r?.poliza_id) return;
      // La ficha de la póliza se actualiza sola (ya no está cancelada).
      dispatch(fetchPolizaPorId({ id: r.poliza_id, force: true }));
      setCola((c) => (c.some((x) => x.poliza_id === r.poliza_id) ? c : [...c, r]));
    };
    window.addEventListener(EVENTO_POLIZA_REACTIVADA, alRecibir);
    return () => window.removeEventListener(EVENTO_POLIZA_REACTIVADA, alRecibir);
  }, [dispatch]);

  const r = cola[0];
  const cerrar = () => setCola((c) => c.slice(1));
  const verPoliza = () => {
    const id = r?.poliza_id;
    cerrar();
    if (id) navigate(`/polizas/${id}`);
  };

  const compania = r?.compania || "la compañía";
  const datos = [r?.patente, r?.compania, r?.numero_poliza ? `Póliza ${r.numero_poliza}` : ""]
    .filter(Boolean)
    .join(" · ");
  const baja = [
    r?.fecha_baja ? `Dada de baja el ${fmtFecha(r.fecha_baja)}` : "Estaba dada de baja",
    r?.motivo_texto || "",
  ]
    .filter(Boolean)
    .join(" · ");
  const yaAvisada = ["ENVIADA", "REALIZADA"].includes(String(r?.baja_compania || "").toUpperCase());
  const estado = ESTADO_TEXTO[r?.estado] || String(r?.estado || "").toUpperCase();
  const debe = Number(r?.cuotas_que_debe || 0);

  return (
    <ModalDuo
      isOpen={Boolean(r)}
      onClose={cerrar}
      title="Esta póliza estaba dada de baja"
      subtitle={datos || null}
      icon={<HiExclamation />}
      iconTono="amarillo"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" onClick={verPoliza} full>
            Ver póliza
          </Boton3D>
          <Boton3D variant="verde" onClick={cerrar} full>
            Entendido
          </Boton3D>
        </>
      }
    >
      {r ? (
        <div className="space-y-3 text-titulo dark:text-titulo-dark">
          <div className="rounded-xl border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4">
            <p className="text-[17px] font-semibold leading-snug text-duo-amarillo-sombra dark:text-duo-amarillo">
              Verificá en {compania} si la póliza sigue activa.
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed">
              El cobro ya quedó registrado. Llamá o entrá al portal de la compañía y confirmá que la póliza
              no esté dada de baja allá.
            </p>
          </div>

          <p className="text-[13px] text-suave dark:text-suave-dark">{baja}</p>

          {yaAvisada ? (
            <p className="rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-medium text-duo-rojo">
              Ojo: a la compañía ya se le pidió la baja de esta póliza.
            </p>
          ) : null}

          {r.reactivada ? (
            <p className="text-[14px] leading-relaxed">
              En Thames volvió a quedar <span className="font-semibold">{estado}</span>
              {r.estado === "vencida" && debe > 0
                ? ` (todavía debe ${debe} ${debe === 1 ? "cuota" : "cuotas"}).`
                : "."}{" "}
              Quedó anotado en las observaciones de la póliza.
            </p>
          ) : (
            <p className="text-[14px] leading-relaxed">
              <span className="font-semibold text-duo-rojo">No se reactivó</span>: este auto ya tiene otra póliza
              viva{r.otra_poliza?.numero_poliza ? ` (N° ${r.otra_poliza.numero_poliza})` : ""}. Revisá cuál
              corresponde.
            </p>
          )}
        </div>
      ) : null}
    </ModalDuo>
  );
}
