// src/components/portal/Papeles.jsx
//
// 📄 Los documentos de las pólizas + los accesos de contacto.
//
// Si todavía no hay papeles cargados NO se muestra un vacío mudo: se explica
// qué pasa y se da una salida (escribir por WhatsApp). Una pantalla vacía sin
// explicación hace que el cliente crea que el portal está roto.

import { Seccion, Lista, Fila, Vacio } from "./Lista";
import { IconDoc, IconChat, IconAlerta } from "./Iconos";
import { waLink } from "./utils";

/**
 * Nombre legible del documento.
 * Prioriza el TIPO (que es el dato confiable) y usa el nombre del archivo
 * como respaldo.
 */
export function nombreLindoDoc(tipo, nombre) {
  const t = String(tipo || "").toUpperCase().trim();
  const n = String(nombre || "").toLowerCase();

  if (t.startsWith("MERCO")) return "Tarjeta Mercosur";
  if (t.startsWith("CUPON")) return "Tu cuponera";
  if (t.startsWith("CERT")) return "Tu certificado";
  if (t.startsWith("DNI")) return "Tu DNI";
  if (t.startsWith("POLIZA") || t === "PRP" || t.startsWith("PROPUESTA") || t.startsWith("FRENTE"))
    return "Tu póliza";

  // Respaldo por nombre de archivo. Mercosur/cuponera/certificado van ANTES
  // que "póliza", porque muchos archivos llevan "poliza" en el nombre.
  if (n.includes("merco")) return "Tarjeta Mercosur";
  if (n.includes("cupon")) return "Tu cuponera";
  if (n.includes("cert")) return "Tu certificado";
  if (n.includes("poliza") || n.includes("propuesta") || n.includes("prp")) return "Tu póliza";

  if (t && t !== "OTRO") return t.charAt(0) + t.slice(1).toLowerCase();
  return "Documento";
}

export default function Papeles({ polizas = [], onVerDoc, nombreCliente }) {
  // Todos los documentos, con la póliza a la que pertenecen.
  const docs = [];
  polizas.forEach((p) => {
    (p.documentos || []).forEach((d) => {
      if (!d?.url) return;
      docs.push({
        url: d.url,
        titulo: nombreLindoDoc(d.tipo, d.nombre),
        sub: `${p.marca || ""} ${p.modelo || ""}`.trim() || p.compania || "",
      });
    });
  });

  const wa = polizas[0]?.oficina_whatsapp;
  const msgPapeles = `Hola, soy ${nombreCliente || ""}. Necesito los papeles de mi póliza.`;
  const msgSiniestro = `Hola, soy ${nombreCliente || ""}. Tuve un siniestro y necesito ayuda.`;

  return (
    <>
      <Seccion extra={docs.length ? `${docs.length}` : null}>Tus documentos</Seccion>

      {docs.length ? (
        <Lista>
          {docs.map((d, i) => (
            <Fila
              key={`${d.url}-${i}`}
              primera={i === 0}
              icono={<IconDoc />}
              titulo={d.titulo}
              sub={d.sub}
              onClick={() => onVerDoc({ url: d.url, nombre: d.titulo })}
            />
          ))}
        </Lista>
      ) : (
        <Vacio
          titulo="Todavía no hay documentos"
          sub="Los estamos cargando. Si los necesitás ahora, escribinos."
          boton={
            wa ? (
              <a
                href={waLink(wa, msgPapeles)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block", marginTop: 12, background: "var(--m)", color: "#fff",
                  borderRadius: 11, padding: 12, fontSize: 14, fontWeight: 600,
                  textAlign: "center",
                }}
              >
                Pedir mis papeles
              </a>
            ) : null
          }
        />
      )}

      {wa ? (
        <>
          <Seccion>Contacto</Seccion>
          <Lista>
            <Fila
              primera
              icono={<IconChat />}
              tono="ok"
              titulo="Consultar por WhatsApp"
              sub="Te respondemos en el día"
              href={waLink(wa, `Hola, soy ${nombreCliente || ""}.`)}
            />
            <Fila
              icono={<IconAlerta />}
              tono="alerta"
              titulo="Tuve un choque o me robaron"
              sub="Avisanos y te guiamos"
              href={waLink(wa, msgSiniestro)}
            />
          </Lista>
        </>
      ) : null}
    </>
  );
}
