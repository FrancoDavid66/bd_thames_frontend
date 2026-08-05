// src/components/solicitudes/ResponsablesModal.jsx
//
// Gestión de responsables (empleados) + selección.
//   · selectMode=false → ABM completo (crear / editar / activar / borrar).
//   · selectMode=true  → lista para elegir uno (botón "Elegir").
// Admin puede asignar sucursal; el empleado hereda la suya.
// Usa `api` (axios con JWT) contra /empleados/ y /usuarios/oficinas/.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiPencil,
  HiCheck,
  HiBan,
  HiSearch,
  HiUserGroup,
  HiShieldCheck,
  HiOfficeBuilding,
  HiTrash,
} from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";

export default function ResponsablesModal({
  onClose,
  onChanged,
  selectMode = false,
  selectedId: selectedIdProp = null,
  onSelect,
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [oficinas, setOficinas] = useState([]);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaOficinaId, setNuevaOficinaId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(selectMode);
  const [selectedId, setSelectedId] = useState(selectedIdProp);

  /* ── cargar ── */
  const cargarOficinas = useCallback(async () => {
    if (!isWebAdmin) return;
    try {
      const res = await api.get("/usuarios/oficinas/");
      setOficinas(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {
      /* silencioso */
    }
  }, [isWebAdmin]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/empleados/");
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      arr.sort((a, b) => {
        if (!!b.activo - !!a.activo !== 0) return !!b.activo - !!a.activo;
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
        });
      });
      setItems(arr);
    } catch {
      toast.error("Error al cargar responsables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    if (isWebAdmin) cargarOficinas();
  }, [cargar, cargarOficinas, isWebAdmin]);

  /* ── acciones ── */
  const crear = async () => {
    const nombre = (nuevoNombre || "").trim();
    if (!nombre) return toast.error("Ingresá un nombre");
    if (isWebAdmin && !nuevaOficinaId) return toast.error("Seleccioná una sucursal");

    setCreating(true);
    try {
      const payload = {
        nombre,
        activo: true,
        oficina: isWebAdmin ? nuevaOficinaId : user?.perfil?.oficina?.id || user?.perfil?.oficina,
      };
      await api.post("/empleados/", payload);
      setNuevoNombre("");
      if (isWebAdmin) setNuevaOficinaId("");
      toast.success("Responsable agregado");
      await cargar();
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "No se pudo crear");
    } finally {
      setCreating(false);
    }
  };

  const activar = async (emp, activo) => {
    try {
      await api.patch(`/empleados/${emp.id}/`, { activo });
      toast.success(activo ? "Activado" : "Desactivado");
      await cargar();
      onChanged?.();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const guardarEdicion = async () => {
    const nombre = (editNombre || "").trim();
    if (!nombre) return toast.error("Nombre requerido");
    try {
      await api.patch(`/empleados/${editId}/`, { nombre });
      toast.success("Nombre actualizado");
      setEditId(null);
      await cargar();
      onChanged?.();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const eliminar = async (emp) => {
    if (!confirm(`¿Eliminar a "${emp.nombre}"?`)) return;
    try {
      await api.delete(`/empleados/${emp.id}/`);
      toast.success("Eliminado");
      await cargar();
      onChanged?.();
      if (String(selectedId) === String(emp.id)) setSelectedId(null);
    } catch {
      toast.error("No se puede eliminar (tiene historial)");
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (onlyActive) list = list.filter((i) => !!i.activo);
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((i) => String(i.nombre || "").toLowerCase().includes(term));
    return list;
  }, [items, q, onlyActive]);

  /* ── render ── */
  return (
    <ModalDuo
      isOpen
      onClose={onClose}
      icon={<HiUserGroup />}
      iconTono="violeta"
      size="md"
      title={selectMode ? "Elegir Responsable" : "Equipo / Responsables"}
      subtitle={isWebAdmin ? "Control global" : `Sucursal: ${user?.perfil?.oficina_nombre || "Local"}`}
    >
      {/* Alta (solo ABM) */}
      {!selectMode && (
        <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className={isWebAdmin ? "sm:col-span-5" : "sm:col-span-9"}>
              <InputDuo
                label="Nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="FRANCO…"
              />
            </div>
            {isWebAdmin && (
              <div className="sm:col-span-4">
                <SelectDuo
                  label="Sucursal"
                  value={nuevaOficinaId}
                  onChange={(e) => setNuevaOficinaId(e.target.value)}
                  placeholder="— Elegir —"
                  options={oficinas.map((o) => ({ value: o.id, label: o.nombre }))}
                />
              </div>
            )}
            <div className="sm:col-span-3">
              <Boton3D variant="violeta" full onClick={crear} disabled={creating}>
                {creating ? "…" : "Agregar"}
              </Boton3D>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <div className="relative flex-1">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-full h-12 pl-12 pr-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[14px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul transition-colors"
          />
        </div>
        <button
          onClick={() => setOnlyActive(!onlyActive)}
          className={`px-4 h-12 rounded-2xl text-[11px] font-black uppercase tracking-wide border-2 transition ${
            onlyActive
              ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde border-duo-verde"
              : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
          }`}
        >
          {onlyActive ? "Solo activos" : "Todos"}
        </button>
      </div>

      {/* Lista */}
      <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden divide-y-2 divide-linea dark:divide-[var(--color-linea-dark)]">
        {loading ? (
          <div className="p-10 text-center text-duo-azul text-[11px] font-black uppercase tracking-widest animate-pulse">
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-suave dark:text-suave-dark text-[11px] font-black uppercase tracking-widest">
            Sin registros
          </div>
        ) : (
          filtered.map((emp) => {
            const editing = editId === emp.id;
            const isSelected = String(selectedId) === String(emp.id);
            return (
              <div
                key={emp.id}
                className={`p-3.5 flex items-center gap-3 ${
                  isSelected ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border-2 border-duo-azul bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark font-bold outline-none"
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col">
                      <p
                        className={`font-black text-[14px] uppercase truncate ${
                          !emp.activo
                            ? "text-suave dark:text-suave-dark line-through"
                            : "text-titulo dark:text-titulo-dark"
                        }`}
                      >
                        {emp.nombre}
                      </p>
                      {isWebAdmin && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-duo-violeta uppercase mt-0.5">
                          <HiOfficeBuilding /> {emp.oficina_nombre || "S/A"}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {selectMode ? (
                    <button
                      onClick={() => {
                        setSelectedId(emp.id);
                        onSelect?.(emp);
                        onClose?.();
                      }}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition ${
                        isSelected
                          ? "bg-duo-violeta text-white"
                          : "bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-duo-violeta"
                      }`}
                    >
                      Elegir
                    </button>
                  ) : editing ? (
                    <>
                      <button onClick={guardarEdicion} className="p-2.5 rounded-xl text-duo-verde-sombra dark:text-duo-verde hover:bg-duo-verde-soft dark:hover:bg-[var(--color-duo-verde-soft-dark)]">
                        <HiCheck />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-2.5 rounded-xl text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]">
                        <HiBan />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditId(emp.id);
                          setEditNombre(emp.nombre);
                        }}
                        className="p-2.5 rounded-xl text-suave dark:text-suave-dark hover:text-duo-azul hover:bg-duo-azul-soft dark:hover:bg-[var(--color-duo-azul-soft-dark)]"
                        title="Editar"
                      >
                        <HiPencil />
                      </button>
                      <button
                        onClick={() => activar(emp, !emp.activo)}
                        className={`p-2.5 rounded-xl ${
                          emp.activo ? "text-duo-verde-sombra dark:text-duo-verde" : "text-duo-amarillo-sombra dark:text-duo-amarillo"
                        } hover:bg-surface dark:hover:bg-surface-dark`}
                        title={emp.activo ? "Desactivar" : "Activar"}
                      >
                        {emp.activo ? <HiShieldCheck /> : <HiBan />}
                      </button>
                      <button
                        onClick={() => eliminar(emp)}
                        className="p-2.5 rounded-xl text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]"
                        title="Eliminar"
                      >
                        <HiTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ModalDuo>
  );
}