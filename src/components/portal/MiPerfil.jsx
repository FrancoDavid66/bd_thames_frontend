// src/components/portal/MiPerfil.jsx
//
// 🎁 "MI PERFIL" del portal + CLUB THAMES (28/10/2026)
//
//    El cliente ve y corrige sus datos (teléfono, email, cumpleaños, estado
//    civil, de qué trabaja y dirección). Se guarda DIRECTO en su ficha de THAMES.
//
//    Si su oficina está en la prueba del Club (hoy El Talita), además ve:
//      · el 5% off (activo cuando el perfil está completo),
//      · su código para "Traé un amigo" y el botón para compartirlo por WhatsApp.
//
//    Es como el "completá tu perfil" de Mercado Libre: una barra que sube y
//    un premio al llegar al 100%.

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { comprimirImagen } from "../../utils/comprimirImagen";

const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

const caja = {
  background: "var(--card)", borderRadius: 18, padding: 16,
  boxShadow: "var(--lista-sombra)", border: "var(--lista-borde)",
};
const etiqueta = {
  fontSize: 12, fontWeight: 700, color: "var(--t2)",
  textTransform: "uppercase", letterSpacing: ".06em",
};
const campo = {
  height: 46, borderRadius: 12, border: "1px solid var(--div)", padding: "0 12px",
  fontSize: 16, color: "var(--t1)", background: "var(--bg)", fontFamily: "inherit",
  width: "100%", boxSizing: "border-box",
};

export default function MiPerfil({ portalBase, token, perfil, club, fotosAuto = [], nombreCliente, onActualizado }) {
  const [form, setForm] = useState(() => desdePerfil(perfil));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Si llegan datos nuevos (recarga), se pisan los del formulario.
  useEffect(() => { setForm(desdePerfil(perfil)); }, [perfil]);

  if (!perfil) return null;

  const pct = calcularPct(form);
  const completo = pct === 100;
  const cambiar = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const guardar = async () => {
    setGuardando(true);
    setErrores({});
    try {
      const res = await fetch(`${portalBase}/${token}/perfil/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.errores) setErrores(json.errores);
        toast.error("Revisá los datos marcados");
        return;
      }
      onActualizado?.(json);
      toast.success(
        club?.activo && json?.perfil?.completo
          ? `¡Listo! Tenés ${club.descuento_pct}% off en tus cuotas`
          : "Datos guardados"
      );
    } catch {
      toast.error("No pudimos guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── 🚗 Portada: la foto del frente de su auto (si la subió) ── */}
      {fotosAuto.find((a) => a.fotos?.[0]?.url) ? (
        <Portada auto={fotosAuto.find((a) => a.fotos?.[0]?.url)} />
      ) : null}

      {/* ── Avance del perfil ── */}
      <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: "var(--t2)" }}>Perfil completo</span>
          <span style={{ color: completo ? "var(--ok)" : "var(--m)" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "var(--div)", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`, height: "100%", borderRadius: 99,
              background: completo ? "var(--ok)" : "var(--m)",
              transition: "width .3s cubic-bezier(.3,.8,.3,1)",
            }}
          />
        </div>
        {club?.activo ? (
          completo ? (
            <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--ok-bg)", color: "var(--ok)", fontSize: 14, fontWeight: 700 }}>
              {perfil.completo
                ? `¡Listo! Tenés ${club.descuento_pct}% off en tus cuotas`
                : "Tocá «Guardar» para activar tu descuento"}
            </div>
          ) : (
            <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.4 }}>
              Completá los datos que faltan y activás el <b>{club.descuento_pct}% off</b> en tus cuotas.
            </span>
          )
        ) : null}
      </div>

      {/* ── Los datos ── */}
      <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo label="Teléfono" error={errores.telefono}>
          <input type="tel" inputMode="tel" value={form.telefono} onChange={cambiar("telefono")} style={campo} />
        </Campo>
        <Campo label="Email" error={errores.email}>
          <input type="email" placeholder="tu@email.com" value={form.email} onChange={cambiar("email")} style={campo} />
        </Campo>
        <Campo label="Cumpleaños" error={errores.fecha_nacimiento}>
          <input type="date" value={form.fecha_nacimiento} onChange={cambiar("fecha_nacimiento")} style={campo} />
        </Campo>
        <Campo label="Estado civil" error={errores.estado_civil}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(perfil.opciones_estado_civil || []).map((o) => {
              const on = form.estado_civil === o.valor;
              return (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, estado_civil: o.valor }))}
                  style={{
                    minHeight: 44, padding: "0 14px", borderRadius: 99, fontSize: 15,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: on ? "var(--m)" : "var(--card)",
                    color: on ? "#fff" : "var(--t1)",
                    border: on ? "1px solid var(--m)" : "1px solid var(--div)",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </Campo>
        <Campo label="¿De qué trabajás?" error={errores.ocupacion}>
          <input type="text" placeholder="Ej: comerciante, docente, chofer" value={form.ocupacion} onChange={cambiar("ocupacion")} style={campo} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion}>
          <input type="text" value={form.direccion} onChange={cambiar("direccion")} style={campo} />
        </Campo>

        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          style={{
            height: 52, borderRadius: 14, border: "none", background: "var(--m)", color: "#fff",
            fontSize: 16.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
            opacity: guardando ? 0.6 : 1, marginTop: 2,
          }}
        >
          {guardando ? "Guardando…" : "Guardar mis datos"}
        </button>
      </div>

      {/* ── 📸 Fotos del auto (nivel 2, opcional) ── */}
      {fotosAuto.length ? (
        <FotosAuto
          autos={fotosAuto}
          portalBase={portalBase}
          token={token}
          onActualizado={(lista) => onActualizado?.({ fotos_auto: lista })}
        />
      ) : null}

      {/* ── Club Thames (solo oficina piloto) ── */}
      {club?.activo ? <ClubThames club={club} perfilCompleto={!!perfil.completo} nombreCliente={nombreCliente} /> : null}
    </div>
  );
}

/* 🚗 La foto del frente arriba de todo: el perfil "con cara". */
function Portada({ auto }) {
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 170, background: "var(--div)" }}>
      <img src={auto.fotos[0].url} alt={`Tu ${auto.auto || "auto"}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: "auto 0 0 0", padding: "28px 16px 12px", background: "linear-gradient(transparent, rgba(0,0,0,.65))", color: "#fff" }}>
        <div style={{ fontSize: 17, fontWeight: 800, textTransform: "capitalize" }}>{(auto.auto || "Mi auto").toLowerCase()}</div>
        <div style={{ fontSize: 13, opacity: 0.85, letterSpacing: ".04em" }}>{auto.patente}</div>
      </div>
    </div>
  );
}

/* 📸 4 fotos por auto: frente, atrás y los dos costados. Opcional.
   La foto se achica en el celular (≈300 KB), sube directo a Cloudinary y al
   backend le llega solo la URL — igual que los comprobantes. */
function FotosAuto({ autos, portalBase, token, onActualizado }) {
  return (
    <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>Sumá las fotos de tu auto</span>
        <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.4 }}>
          Tu perfil queda más lindo y, si algún día tenés un siniestro, ya tenemos cómo estaba tu auto.
        </span>
      </div>
      {autos.map((a) => (
        <div key={a.poliza_id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            {(a.auto || "Mi auto")} · {a.patente} {a.completas ? "· ✓" : ""}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {a.fotos.map((f) => (
              <SlotFoto key={f.tipo} foto={f} polizaId={a.poliza_id} portalBase={portalBase} token={token} onActualizado={onActualizado} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotFoto({ foto, polizaId, portalBase, token, onActualizado }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Elegí una foto."); return; }
    setSubiendo(true);
    try {
      const chica = await comprimirImagen(file);
      const up = await uploadToCloudinary(chica, "portal/autos");
      const res = await fetch(`${portalBase}/${token}/foto-auto/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poliza_id: polizaId, tipo: foto.tipo, url: up.secure_url, public_id: up.public_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || "No se pudo guardar");
      onActualizado?.(json.fotos_auto || []);
      toast.success("¡Foto guardada!");
    } catch (err) {
      console.error("[portal] foto auto:", err);
      toast.error("No se pudo subir. Probá de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      disabled={subiendo}
      aria-label={`${foto.url ? "Cambiar" : "Subir"} foto: ${foto.label}`}
      style={{
        position: "relative", height: 104, borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: foto.url ? "none" : "1.5px dashed var(--div)", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4, fontFamily: "inherit", color: "var(--t2)", padding: 0,
      }}
    >
      {foto.url ? (
        <>
          <img src={foto.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", left: 6, bottom: 6, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.55)", padding: "3px 7px", borderRadius: 99 }}>
            {foto.label}
          </span>
        </>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{subiendo ? "Subiendo…" : foto.label}</span>
        </>
      )}
      {subiendo && foto.url ? (
        <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>Subiendo…</span>
      ) : null}
      <input ref={input} type="file" accept="image/*" capture="environment" onChange={elegir} style={{ display: "none" }} />
    </button>
  );
}

function ClubThames({ club, perfilCompleto, nombreCliente }) {
  const [copiado, setCopiado] = useState(false);
  const nombre = (nombreCliente || "").split(" ")[0];
  const mensaje =
    `¡Hola! Yo tengo el seguro del auto con Thames Seguros y estoy muy bien atendido. ` +
    `Si te asegurás con ellos, decí mi código *${club.codigo_invitacion}* y arrancás con ` +
    `${money(club.premio_invitado)} de descuento.${nombre ? ` — ${nombre}` : ""}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(club.codigo_invitacion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast("Tu código: " + club.codigo_invitacion);
    }
  };

  return (
    <>
      <div style={{ ...caja, padding: "4px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--m-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--m)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></svg>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{club.descuento_pct}% off todos los meses</span>
            <span style={{ fontSize: 13, color: "var(--t2)" }}>Con tu perfil completo y la cuota al día</span>
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 99,
              color: club.beneficio_activo ? "var(--ok)" : "var(--t2)",
              background: club.beneficio_activo ? "var(--ok-bg)" : "var(--bg)",
            }}
          >
            {club.beneficio_activo ? "Activo" : "Falta perfil"}
          </span>
        </div>
      </div>

      {/* 🏅 Beneficios de socio */}
      {(club.beneficios_socio || []).length ? (
        <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Tus beneficios de socio</span>
            <span
              style={{
                fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 99,
                color: perfilCompleto ? "var(--ok)" : "var(--t2)",
                background: perfilCompleto ? "var(--ok-bg)" : "var(--bg)",
              }}
            >
              {perfilCompleto ? "Activos" : "Con perfil completo"}
            </span>
          </div>
          {club.beneficios_socio.map((b, i) => (
            <div key={b.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--div)" : "none", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{b.titulo}</span>
              <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.4 }}>{b.texto}</span>
              {b.ejemplo ? (
                <span style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: "var(--ok)", background: "var(--ok-bg)", padding: "8px 10px", borderRadius: 10, lineHeight: 1.35 }}>
                  {b.ejemplo}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ ...caja, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Invitá a un amigo y ganá {money(club.premio_amigo)}</span>
          <span style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.4 }}>
            Los {money(club.premio_amigo)} son para vos por cada amigo que se suma. Tu amigo arranca
            con {money(club.premio_invitado)} de descuento en su primera cuota.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "var(--bg)", border: "1px dashed var(--div)" }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 800, letterSpacing: ".05em" }}>{club.codigo_invitacion}</span>
          <button
            type="button"
            onClick={copiar}
            style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, border: "none", background: "var(--card)", color: "var(--m)", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, background: "#15704F", color: "#fff", fontSize: 16, fontWeight: 700 }}
        >
          Compartir por WhatsApp
        </a>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <Dato valor={club.invitados} texto="Invitados" />
          <Dato valor={money(club.premios_pendientes)} texto="Por cobrar" />
          <Dato valor={money(club.premios_ganados)} texto="Cobraste" verde />
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.45, margin: "0 4px" }}>
        Los descuentos y premios se aplican en la oficina. El premio por amigo se paga cuando tu
        amigo abona su primera cuota.
      </p>
    </>
  );
}

function Campo({ label, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={etiqueta}>{label}</span>
      {children}
      {error ? <span style={{ fontSize: 13, color: "var(--al)", fontWeight: 600 }}>{error}</span> : null}
    </label>
  );
}

function Dato({ valor, texto, verde }) {
  return (
    <div style={{ background: verde ? "var(--ok-bg)" : "var(--bg)", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: verde ? "var(--ok)" : "var(--t1)" }}>{valor}</span>
      <span style={{ fontSize: 12, color: verde ? "var(--ok)" : "var(--t2)" }}>{texto}</span>
    </div>
  );
}

// ── helpers ──
function desdePerfil(p) {
  return {
    telefono: p?.telefono || "",
    email: p?.email || "",
    fecha_nacimiento: p?.fecha_nacimiento || "",
    estado_civil: p?.estado_civil || "",
    ocupacion: p?.ocupacion || "",
    direccion: p?.direccion || "",
  };
}

// Mismos 5 campos que el backend (clientes/club.py → CAMPOS_PERFIL).
function calcularPct(f) {
  const campos = [f.telefono, f.email, f.fecha_nacimiento, f.estado_civil, f.ocupacion];
  const llenos = campos.filter((v) => String(v || "").trim()).length;
  return Math.round((llenos * 100) / campos.length);
}
