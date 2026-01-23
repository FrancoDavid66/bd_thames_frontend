// src/components/bajas/BajasTable.jsx

function toDigits(s) {
  return String(s || "").replace(/[^\d]/g, "");
}

function waUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  if (!d) return "";
  let n = d;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  if (!n.startsWith("54")) n = `54${n}`;
  return `https://wa.me/${n}`;
}

function telUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  if (!d) return "";
  return `tel:${d}`;
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function getClienteObject(p) {
  const c = p?.cliente;
  return c && typeof c === "object" ? c : null;
}

function resolveAsegurado(p) {
  const c = getClienteObject(p);

  const nombreCompleto =
    pickFirst(
      c?.nombre_completo,
      c?.nombreCompleto,
      p?.cliente_nombre_completo,
      p?.clienteNombreCompleto,
      p?.asegurado_nombre_completo,
      p?.aseguradoNombreCompleto
    ) ||
    pickFirst(
      `${pickFirst(c?.apellido, p?.cliente_apellido, p?.clienteApellido, p?.asegurado_apellido, p?.aseguradoApellido)} ${pickFirst(
        c?.nombre,
        p?.cliente_nombre,
        p?.clienteNombre,
        p?.asegurado_nombre,
        p?.aseguradoNombre
      )}`.trim()
    );

  const dni =
    pickFirst(
      c?.dni_cuit_cuil,
      c?.dni,
      p?.cliente_dni_cuit_cuil,
      p?.clienteDniCuitCuil,
      p?.cliente_dni,
      p?.clienteDni,
      p?.asegurado_dni_cuit_cuil,
      p?.aseguradoDniCuitCuil,
      p?.asegurado_dni,
      p?.aseguradoDni
    ) || "—";

  const tel = pickFirst(
    c?.telefono,
    c?.celular,
    c?.whatsapp,
    p?.cliente_telefono,
    p?.clienteTelefono,
    p?.cliente_celular,
    p?.clienteCelular,
    p?.cliente_whatsapp,
    p?.clienteWhatsapp,
    p?.asegurado_telefono,
    p?.aseguradoTelefono,
    p?.asegurado_celular,
    p?.aseguradoCelular,
    p?.asegurado_whatsapp,
    p?.aseguradoWhatsapp
  );

  const nombreFinal = nombreCompleto || "Asegurado desconocido";
  return { nombre: nombreFinal, dni, tel };
}

const STATUS_LABEL = {
  ENVIAR_BAJA: "Enviar la baja",
  BAJA_ENVIADA: "Baja enviada",
  BAJA_REALIZADA: "Baja realizada",
  OK: "OK",
};

function statusPill(status) {
  const s = String(status || "ENVIAR_BAJA");
  if (s === "BAJA_REALIZADA") return "bg-emerald-500/15 text-emerald-200";
  if (s === "BAJA_ENVIADA") return "bg-amber-500/20 text-amber-100";
  if (s === "ENVIAR_BAJA") return "bg-red-500/15 text-red-200";
  return "bg-white/10 text-white";
}

export default function BajasTable({
  items = [],
  destinatario = "",
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onComposeEmail,
  onSetStatus,
}) {
  const rows = Array.isArray(items) ? items : [];
  const sel = selectedIds || new Set();

  const allVisibleSelected =
    rows.length > 0 && rows.every((p) => sel.has(String(p.id)));

  const someVisibleSelected =
    rows.length > 0 && rows.some((p) => sel.has(String(p.id)));

  const handleSelectAll = (checked) => {
    onSelectAllVisible && onSelectAllVisible(checked);
  };

  const sendSingleEmail = (p) => {
    if (!destinatario || !String(destinatario).trim()) {
      alert("Falta el Hotmail destino (campo 'Enviar a').");
      return;
    }
    onComposeEmail && onComposeEmail([String(p.id)]);
    // al “enviar”, lo pasamos a “baja enviada”
    onSetStatus && onSetStatus(p.id, "BAJA_ENVIADA");
  };

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 text-xs font-bold opacity-80">
        <div className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            aria-label="Seleccionar todas las visibles"
          />
          <span>Sel</span>
        </div>
        <div className="col-span-3">Asegurado</div>
        <div className="col-span-2">Póliza</div>
        <div className="col-span-2">Estado baja</div>
        <div className="col-span-2">Próx. impaga</div>
        <div className="col-span-1">Impagas</div>
        <div className="col-span-1">Mora</div>
      </div>

      {rows.length === 0 ? (
        <div className="p-5 text-sm opacity-80">Sin resultados.</div>
      ) : (
        rows.map((p) => {
          const { nombre, dni, tel } = resolveAsegurado(p);
          const wa = waUrl(tel);
          const call = telUrl(tel);

          const bajaStatus = p?._bajaStatus || "ENVIAR_BAJA";
          const statusText = STATUS_LABEL[bajaStatus] || String(bajaStatus);

          const isSelected = sel.has(String(p.id));

          return (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-white/10 bg-black/10 hover:bg-black/20"
            >
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect && onToggleSelect(p.id)}
                  aria-label={`Seleccionar póliza ${p?.numero_poliza || p.id}`}
                />
              </div>

              <div className="col-span-3">
                <div className="font-semibold">{nombre}</div>
                <div className="text-xs opacity-75">
                  DNI: {dni}
                  {tel ? (
                    <>
                      {" "}
                      ·{" "}
                      {wa ? (
                        <a className="underline hover:opacity-90" href={wa} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      ) : (
                        <span>{tel}</span>
                      )}
                      {call ? (
                        <>
                          {" "}
                          ·{" "}
                          <a className="underline hover:opacity-90" href={call}>
                            Llamar
                          </a>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="col-span-2 text-sm">
                <div className="font-semibold">{p?.numero_poliza || "—"}</div>
                <div className="text-xs opacity-75">{p?.compania || "—"}</div>
                <a
                  href={`/polizas/${p.id}`}
                  className="text-xs underline opacity-90 hover:opacity-100"
                >
                  Ver póliza
                </a>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${statusPill(bajaStatus)}`}>
                    {statusText}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      bajaStatus === "ENVIAR_BAJA"
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-100"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                    onClick={() => sendSingleEmail(p)}
                    title="Abrir mail y marcar como 'Baja enviada'"
                  >
                    Enviar la baja
                  </button>

                  <button
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      bajaStatus === "BAJA_ENVIADA"
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-100"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                    onClick={() => onSetStatus && onSetStatus(p.id, "BAJA_ENVIADA")}
                  >
                    Baja enviada
                  </button>

                  <button
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      bajaStatus === "BAJA_REALIZADA"
                        ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                    onClick={() => onSetStatus && onSetStatus(p.id, "BAJA_REALIZADA")}
                  >
                    Baja realizada
                  </button>
                </div>
              </div>

              <div className="col-span-2 text-sm">{p?.proxima_vencimiento_impaga || "—"}</div>

              <div className="col-span-1 text-sm">{Number(p?.impagas_count) || 0}</div>

              <div className="col-span-1 text-sm">
                {p?._diasMora == null ? "—" : `${p._diasMora}d`}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
