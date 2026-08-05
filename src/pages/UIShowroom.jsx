// src/pages/UIShowroom.jsx
// 🎨 Showroom de la librería UI de THAMES.
// Montá esta página en una ruta (ej: /ui) para ver y probar todos los componentes.
// Sirve de documentación viva para vos y tu equipo.
import { useState } from "react";
import {
  HiUserAdd, HiPhone, HiOfficeBuilding, HiCheck, HiTrash, HiPencilAlt, HiSun, HiMoon,
} from "react-icons/hi";

import Boton3D from "../components/ui/Boton3D";
import CardDuo from "../components/ui/CardDuo";
import Badge, { estadoATono } from "../components/ui/Badge";
import InputDuo from "../components/ui/InputDuo";
import SelectDuo from "../components/ui/SelectDuo";
import BarraProgreso from "../components/ui/BarraProgreso";
import ModalDuo from "../components/ui/ModalDuo";
import TablaDuo from "../components/ui/TablaDuo";

const Seccion = ({ titulo, children }) => (
  <section className="mb-8">
    <h2 className="inline-block bg-marca text-white text-[13px] font-black uppercase tracking-wide px-4 py-1.5 rounded-full mb-4">
      {titulo}
    </h2>
    <CardDuo className="p-5">{children}</CardDuo>
  </section>
);

const CLIENTES_DEMO = [
  { id: 1, nombre: "Martín", apellido: "González", dni: "20.345.678", estado: "COMPLETO", polizas: 3 },
  { id: 2, nombre: "Lucía", apellido: "Ramírez", dni: "27.891.234", estado: "BORRADOR", polizas: 1 },
  { id: 3, nombre: "Carlos", apellido: "Pérez", dni: "23.456.789", estado: "COMPLETO", polizas: 2 },
];

export default function UIShowroom() {
  const [dark, setDark] = useState(false);
  const [modal, setModal] = useState(false);
  const [paso, setPaso] = useState(2);

  // toggle de tema local (solo para esta página de prueba)
  const toggleTema = () => {
    setDark((d) => {
      const nuevo = !d;
      document.documentElement.classList.toggle("dark", nuevo);
      return nuevo;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">🎨 Librería UI · THAMES</h1>
            <p className="text-suave dark:text-suave-dark font-extrabold text-sm mt-1">
              Todos los componentes reutilizables. Probá el modo oscuro →
            </p>
          </div>
          <Boton3D variant={dark ? "amarillo" : "azul"} size="sm" onClick={toggleTema}>
            {dark ? <><HiSun className="text-lg" /> Claro</> : <><HiMoon className="text-lg" /> Oscuro</>}
          </Boton3D>
        </div>

        {/* BOTONES */}
        <Seccion titulo="🔘 Boton3D">
          <div className="flex flex-wrap gap-3">
            <Boton3D variant="verde">Verde</Boton3D>
            <Boton3D variant="azul">Azul</Boton3D>
            <Boton3D variant="rojo"><HiTrash /> Borrar</Boton3D>
            <Boton3D variant="amarillo">Amarillo</Boton3D>
            <Boton3D variant="blanco">Cancelar</Boton3D>
            <Boton3D variant="violeta">Violeta</Boton3D>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 items-center">
            <Boton3D variant="verde" size="sm">Chico</Boton3D>
            <Boton3D variant="verde" size="md">Mediano</Boton3D>
            <Boton3D variant="verde" size="lg">Grande</Boton3D>
            <Boton3D variant="azul" disabled>Deshabilitado</Boton3D>
          </div>
        </Seccion>

        {/* BADGES */}
        <Seccion titulo="🏷️ Badge">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge tono="verde">Completo</Badge>
            <Badge tono="amarillo">Pendiente</Badge>
            <Badge tono="rojo">Vencida</Badge>
            <Badge tono="azul">Info</Badge>
            <Badge tono="violeta">Extra</Badge>
            <Badge tono="neutro">Neutro</Badge>
          </div>
          <p className="text-suave dark:text-suave-dark text-xs font-extrabold mt-4">
            Con helper automático: <code>estadoATono("COMPLETO")</code> →{" "}
            <Badge tono={estadoATono("COMPLETO")}>Completo</Badge>{" "}
            <Badge tono={estadoATono("vencida")}>Vencida</Badge>
          </p>
        </Seccion>

        {/* INPUTS */}
        <Seccion titulo="⌨️ InputDuo / SelectDuo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputDuo label="Nombre" required placeholder="Escribí un nombre…" />
            <InputDuo label="Teléfono" icon={<HiPhone />} placeholder="11 5555-1234" />
            <InputDuo label="Con error" error="El email no es válido" defaultValue="mal-email" />
            <SelectDuo
              label="Sucursal"
              placeholder="Elegí una…"
              options={[{ value: "1", label: "Centro" }, { value: "2", label: "Norte" }]}
            />
          </div>
        </Seccion>

        {/* BARRA DE PROGRESO */}
        <Seccion titulo="📊 BarraProgreso (pasos o %)">
          <div className="space-y-5">
            <BarraProgreso paso={paso} totalPasos={4} label="Alta de cliente (por pasos)" />
            <div className="flex gap-2">
              <Boton3D variant="blanco" size="sm" onClick={() => setPaso((p) => Math.max(0, p - 1))}>◀ Atrás</Boton3D>
              <Boton3D variant="verde" size="sm" onClick={() => setPaso((p) => Math.min(4, p + 1))}>Siguiente ▶</Boton3D>
            </div>
            <BarraProgreso valor={80} label="Completitud (por %)" tono="azul" />
            <BarraProgreso valor={100} label="Cobro terminado" />
          </div>
        </Seccion>

        {/* MODAL */}
        <Seccion titulo="🪟 ModalDuo">
          <Boton3D variant="azul" onClick={() => setModal(true)}>
            <HiUserAdd /> Abrir modal de ejemplo
          </Boton3D>
          <ModalDuo
            isOpen={modal}
            onClose={() => setModal(false)}
            title="Alta de Cliente"
            subtitle="Ejemplo de modal reutilizable"
            icon={<HiUserAdd />}
            iconTono="verde"
            footer={
              <>
                <Boton3D variant="blanco" size="md" onClick={() => setModal(false)}>Cancelar</Boton3D>
                <Boton3D variant="verde" size="md" onClick={() => setModal(false)}><HiCheck /> Guardar</Boton3D>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputDuo label="Nombre" required placeholder="Nombre…" />
              <InputDuo label="Apellido" required placeholder="Apellido…" />
              <InputDuo label="Teléfono" icon={<HiPhone />} placeholder="Teléfono…" />
              <InputDuo label="DNI" placeholder="DNI…" />
            </div>
          </ModalDuo>
        </Seccion>

        {/* TABLA */}
        <Seccion titulo="📋 TablaDuo (desktop tabla · mobile cards)">
          <TablaDuo
            columns={[
              { key: "nombre", header: "Cliente", render: (c) => `${c.nombre} ${c.apellido}` },
              { key: "dni", header: "DNI / CUIT" },
              { key: "polizas", header: "Pólizas", align: "center", render: (c) => (
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul font-black">{c.polizas}</span>
              ) },
              { key: "estado", header: "Estado", align: "center", render: (c) => <Badge tono={estadoATono(c.estado)}>{c.estado}</Badge> },
            ]}
            rows={CLIENTES_DEMO}
            onRowClick={(c) => alert(`Clickeaste a ${c.nombre}`)}
          />
        </Seccion>

        <p className="text-center text-suave dark:text-suave-dark font-extrabold text-xs mt-8">
          Todos importables desde <code>src/components/ui/</code> · claro + oscuro incluidos 🌗
        </p>
      </div>
    </div>
  );
}
