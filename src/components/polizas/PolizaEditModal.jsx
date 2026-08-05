// src/components/polizas/PolizaEditModal.jsx
import { useState, useEffect, useMemo } from "react";
import { HiDocumentText } from "react-icons/hi";
import toast from "react-hot-toast";

import { useDispatch } from "react-redux";
import { updatePoliza } from "../../store/slices/polizasSlice";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";

import ModalDuo from "../ui/ModalDuo";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";
import Boton3D from "../ui/Boton3D";

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];
const COMBUSTIBLES = ["Nafta", "Diésel", "GNC", "Nafta/GNC", "Eléctrico", "Híbrido"];
// 🚀 Mismas opciones que el modal de solicitud (PolizaStep)
const CARROCERIAS = [
  "Sedán", "Hatchback", "SUV", "Pick-up", "Familiar / Rural",
  "Coupé", "Furgón", "Utilitario", "Moto", "Otro",
];

// Datos generales de la póliza (en orden)
const CAMPOS = [
  "compania",
  "numero_poliza",
  "cobertura",
  "oficina",
  "patente",
  "marca",
  "modelo",
  "anio",
  "tipo",
];

const LABELS = {
  compania: "Compañía",
  numero_poliza: "Número de póliza",
  cobertura: "Cobertura",
  oficina: "Oficina",
  patente: "Patente",
  marca: "Marca",
  modelo: "Modelo",
  anio: "Año",
  tipo: "Tipo",
  combustible: "Combustible",
  numero_chasis: "N° de Chasis",
  numero_motor: "N° de Motor",
  carroceria: "Carrocería",
  observaciones: "Observaciones",
};

const capitalizar = (v) =>
  typeof v === "string" && v.length ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v;

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [companias, setCompanias] = useState([]);
  const [coberturas, setCoberturas] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [saving, setSaving] = useState(false);

  // 🚀 Estado propio del formulario (sin hooks externos que se pisen)
  const [formData, setFormData] = useState({});

  // Cargar formulario cuando llega la póliza
  useEffect(() => {
    if (poliza) {
      setFormData({
        compania: poliza.compania || "",
        numero_poliza: poliza.numero_poliza || "",
        cobertura: poliza.cobertura || "",
        oficina: poliza.oficina ?? "",
        patente: poliza.patente || "",
        marca: poliza.marca || "",
        modelo: poliza.modelo || "",
        anio: poliza.anio ?? "",
        tipo: poliza.tipo || "Auto",
        // 🚀 Datos técnicos del vehículo
        combustible: poliza.combustible || "",
        numero_chasis: poliza.numero_chasis || "",
        numero_motor: poliza.numero_motor || "",
        carroceria: poliza.carroceria || "",
        observaciones: poliza.observaciones || "",
      });
    }
  }, [poliza]);

  // Cargar catálogos al abrir
  useEffect(() => {
    if (!isOpen) return;

    api
      .get("companias/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCompanias(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(console.warn);

    api
      .get("coberturas/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCoberturas(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(console.warn);

    if (isWebAdmin) {
      PolizasAPI.listOficinas()
        .then((res) => setOficinas(Array.isArray(res) ? res : res.results || []))
        .catch(console.warn);
    }
  }, [isOpen, isWebAdmin]);

  // 🛡️ Inyectamos SIEMPRE el valor actual como opción, aunque el catálogo venga vacío.
  const opcionesCompania = useMemo(() => {
    const set = new Set([poliza?.compania, ...companias].filter(Boolean));
    return Array.from(set);
  }, [companias, poliza?.compania]);

  const opcionesCobertura = useMemo(() => {
    const set = new Set([poliza?.cobertura, ...coberturas].filter(Boolean));
    return Array.from(set);
  }, [coberturas, poliza?.cobertura]);

  const opcionesCombustible = useMemo(() => {
    const set = new Set([poliza?.combustible, ...COMBUSTIBLES].filter(Boolean));
    return Array.from(set);
  }, [poliza?.combustible]);

  const opcionesCarroceria = useMemo(() => {
    const set = new Set([poliza?.carroceria, ...CARROCERIAS].filter(Boolean));
    return Array.from(set);
  }, [poliza?.carroceria]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poliza?.id) return;

    // Validación mínima (los datos técnicos son opcionales)
    const requeridos = ["compania", "cobertura", "patente", "marca", "modelo", "anio"];
    const faltan = requeridos.filter((k) => !String(formData[k] ?? "").trim());
    if (faltan.length) {
      toast.error(`Faltan completar: ${faltan.map((k) => LABELS[k] || k).join(", ")}`);
      return;
    }

    const numero = String(formData.numero_poliza || "").trim();
    const payload = {
      id: poliza.id,
      compania: formData.compania,
      cobertura: formData.cobertura,
      patente: String(formData.patente || "").toUpperCase().trim(),
      marca: String(formData.marca || "").trim(),
      modelo: String(formData.modelo || "").trim(),
      anio: formData.anio ? Number(formData.anio) : null,
      tipo: capitalizar(formData.tipo) || "Auto",
      numero_poliza: numero || null,
      // 🚀 Datos técnicos del vehículo (opcionales)
      combustible: String(formData.combustible || "").trim(),
      numero_chasis: String(formData.numero_chasis || "").trim().toUpperCase(),
      numero_motor: String(formData.numero_motor || "").trim().toUpperCase(),
      carroceria: String(formData.carroceria || "").trim(),
      observaciones: String(formData.observaciones || "").trim(),
    };

    if (!numero) payload.sin_numero = true;

    if (isWebAdmin && formData.oficina && String(formData.oficina) !== String(poliza.oficina ?? "")) {
      payload.oficina = formData.oficina;
    }

    setSaving(true);
    try {
      await dispatch(updatePoliza(payload)).unwrap();
      toast.success("Póliza actualizada correctamente");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const apiErr = err?.response?.data || err;
      if (apiErr && typeof apiErr === "object" && !Array.isArray(apiErr)) {
        const firstKey = Object.keys(apiErr)[0];
        const firstVal = Array.isArray(apiErr[firstKey]) ? apiErr[firstKey][0] : apiErr[firstKey];
        toast.error(firstKey ? `${firstKey}: ${firstVal}` : "Error al editar la póliza");
      } else {
        toast.error(typeof apiErr === "string" ? apiErr : "Error al editar la póliza");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !poliza) return null;

  // Render de un campo de "Datos generales"
  const renderCampoGeneral = (key) => {
    const isOficinaField = key === "oficina";
    const isDisabled = isOficinaField && !isWebAdmin;
    const esSelect = ["compania", "oficina", "cobertura", "tipo"].includes(key);
    const label = LABELS[key] || key.replace("_", " ");

    if (esSelect) {
      let opts = [];
      if (key === "oficina") opts = oficinas.map((o) => ({ value: o.id, label: o.nombre }));
      else if (key === "compania") opts = opcionesCompania.map((o) => ({ value: o, label: o }));
      else if (key === "cobertura") opts = opcionesCobertura.map((o) => ({ value: o, label: o }));
      else opts = TIPOS_VEHICULO.map((o) => ({ value: o, label: o }));

      return (
        <SelectDuo
          key={key}
          label={isOficinaField && !isWebAdmin ? `${label} (Solo Admin)` : label}
          name={key}
          value={formData[key] ?? ""}
          onChange={handleChange}
          disabled={isDisabled}
          options={opts}
          placeholder="— Seleccionar —"
        />
      );
    }

    return (
      <InputDuo
        key={key}
        label={label}
        name={key}
        inputMode={key === "anio" ? "numeric" : undefined}
        value={formData[key] ?? ""}
        onChange={handleChange}
        placeholder={key === "patente" ? "ABC 123" : key === "anio" ? "2024" : ""}
      />
    );
  };

  return (
    <ModalDuo
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Póliza"
      subtitle={`ID Sistema: ${poliza.id}`}
      icon={<HiDocumentText />}
      iconTono="amarillo"
      size="lg"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={saving} full>
            Cancelar
          </Boton3D>
          <Boton3D variant="verde" type="submit" form="form-editar-poliza" disabled={saving} full>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Boton3D>
        </>
      }
    >
      <form id="form-editar-poliza" onSubmit={handleSubmit} className="space-y-8">
        {/* ── Bloque 1: Datos de la póliza ── */}
        <div>
          <h3 className="text-[11px] font-black text-duo-verde-sombra dark:text-duo-verde uppercase tracking-wide mb-4 ml-1">
            Datos de la Póliza
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {CAMPOS.map((key) => renderCampoGeneral(key))}
          </div>
        </div>

        {/* ── Bloque 2: Datos técnicos del vehículo ── */}
        <div>
          <h3 className="text-[11px] font-black text-duo-azul uppercase tracking-wide mb-4 ml-1">
            Datos Técnicos del Vehículo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <SelectDuo
              label={LABELS.combustible}
              name="combustible"
              value={formData.combustible ?? ""}
              onChange={handleChange}
              options={opcionesCombustible.map((o) => ({ value: o, label: o }))}
              placeholder="— Seleccionar —"
            />

            <SelectDuo
              label={LABELS.carroceria}
              name="carroceria"
              value={formData.carroceria ?? ""}
              onChange={handleChange}
              options={opcionesCarroceria.map((o) => ({ value: o, label: o }))}
              placeholder="— Seleccionar —"
            />

            <InputDuo
              label={LABELS.numero_chasis}
              name="numero_chasis"
              value={formData.numero_chasis ?? ""}
              onChange={handleChange}
              placeholder="8AP…"
              className="[&_input]:font-mono [&_input]:uppercase"
            />

            <InputDuo
              label={LABELS.numero_motor}
              name="numero_motor"
              value={formData.numero_motor ?? ""}
              onChange={handleChange}
              placeholder="Ej: HFX…"
              className="[&_input]:font-mono [&_input]:uppercase"
            />

            {/* Observaciones (ocupa las 2 columnas) */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark ml-1">
                {LABELS.observaciones}
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones ?? ""}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3 text-[15px] font-bold text-titulo dark:text-titulo-dark outline-none transition-colors resize-none focus:border-duo-azul placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal"
                placeholder="Notas adicionales del vehículo…"
              />
            </div>
          </div>
        </div>
      </form>
    </ModalDuo>
  );
};

export default PolizaEditModal;
