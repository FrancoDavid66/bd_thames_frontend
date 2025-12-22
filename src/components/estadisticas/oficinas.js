// src/components/estadisticas/oficinas.js
export const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

export const getOficinaNombre = (valor) => {
  if (!valor) return "SIN_OFICINA";
  const id = String(valor).trim();
  const match = OFICINAS.find((o) => o.id === id);
  return match ? match.nombre : valor;
};
