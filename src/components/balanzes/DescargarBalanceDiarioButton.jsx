// src/components/balanzes/DescargarBalanceDiarioButton.jsx
import { useState } from "react";
import dayjs from "dayjs";
import { HiOutlineDownload } from "react-icons/hi";
import axios from "axios";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL; 

const DescargarBalanceDiarioButton = ({
  fecha,
  oficina,
  className = "",
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      // 1. Buscamos el token del usuario logueado
      const token = localStorage.getItem("access_token");
      
      // 2. Armamos los parámetros (fecha y sucursal si eligió alguna)
      const params = new URLSearchParams({ fecha: fecha || dayjs().format("YYYY-MM-DD") });
      if (oficina && oficina !== "ALL") {
        params.append("oficina", oficina);
      }

      // 3. 🚀 MAGIA: Le pedimos el Excel a Django (con la URL corregida)
      const response = await axios.get(`${BASE_URL}balance-diario/exportar/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob", 
      });

      // 4. Intentamos sacar el nombre del archivo que nos mandó Django
      let fileName = `Reporte_${fecha}.xlsx`;
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        fileName = disposition.split("filename=")[1].replace(/"/g, "");
      }

      // 5. Forzamos la descarga en el navegador
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      
      // 6. Limpiamos la basura invisible que creamos para la descarga
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Reporte descargado correctamente");

    } catch (error) {
      console.error("Error descargando el Excel:", error);
      toast.error("Hubo un error al generar el Excel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title="Descargar Reporte Gerencial con Gráficos"
      className={`
        inline-flex items-center justify-center gap-2 w-full sm:w-auto
        h-10 sm:h-11 px-4 sm:px-5 rounded-2xl
        text-xs sm:text-sm font-bold tracking-wide
        shadow-lg
        transition-all active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950
        ${
          loading
            ? "bg-sky-500/50 cursor-not-allowed border-sky-500/10 text-white animate-pulse"
            : "bg-sky-500 hover:bg-sky-400 hover:shadow-sky-500/30 border border-sky-400/50 text-white"
        }
        ${className}
      `}
    >
      <HiOutlineDownload className={`text-lg ${!loading && "animate-bounce-short"}`} />
      <span>{loading ? "Generando Reporte..." : "Descargar Excel Diario"}</span>
    </button>
  );
};

export default DescargarBalanceDiarioButton;