// src/components/gruas/SolicitarGruaModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiX,
  HiSearch,
  HiLink,
  HiLocationMarker,
  HiUpload,
  HiTrash,
  HiCheckCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { uploadToCloudinary } from "../../utils/cloudinary";
import {
  buscarPolizasAdheridas,
  selectPolizasAdheridasBuscar,
  selectPolizasAdheridasBuscarStatus,
  createSolicitud,
} from "../../store/slices/gruasSlice";

/* =========================
   Utils
========================= */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function parseGoogleMapsLatLng(urlOrText) {
  const s = String(urlOrText || "").trim();
  if (!s) return null;

  // 1) @lat,lng
  let m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // 2) q=lat,lng
  m = s.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // 3) ll=lat,lng
  m = s.match(/[?&]ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  return null;
}

function haversineKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

// Intenta transformar links largos "place/..." en uno corto "@lat,lng,17z"
function shortenMapsUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const coords = parseGoogleMapsLatLng(s);
  if (!coords) return s;

  // link corto, baja muchísimo el largo y pasa max_length
  const z = s.includes(",15z") ? "15z" : s.includes(",16z") ? "16z" : "17z";
  return `https://www.google.com/maps/@${coords.lat},${coords.lng},${z}`;
}

function PolizaLine({ p }) {
  const patente = (p?.patente || "").toString().toUpperCase();
  const comp = p?.compania || "";
  const dni = p?.cliente?.dni_cuit_cuil || p?.cliente_dni || "";
  const nom =
    `${p?.cliente?.apellido || ""} ${p?.cliente?.nombre || ""}`.trim() ||
    p?.cliente_nombre ||
    "Asegurado";

  const extra = [comp, dni].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0">
      <div className="text-sm font-semibold text-slate-100 truncate">
        {patente || "—"} · {nom}
      </div>
      <div className="text-xs text-slate-400 truncate">{extra || "—"}</div>
    </div>
  );
}

/* =========================
   Component
========================= */
export default function SolicitarGruaModal({ open, onClose, onCreated }) {
  const dispatch = useDispatch();
  const qRef = useRef(null);

  const polizas = useSelector(selectPolizasAdheridasBuscar);
  const polizasStatus = useSelector(selectPolizasAdheridasBuscarStatus);

  const [step, setStep] = useState(1);

  // buscar póliza adherida
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [polizaSel, setPolizaSel] = useState(null);

  // ✅ adhesion_id requerido por backend
  const [adhesionId, setAdhesionId] = useState(null);
  const [adhesionLoading, setAdhesionLoading] = useState(false);

  // Motivo / notas
  const [motivo, setMotivo] = useState("PRUEBA");
  const [notas, setNotas] = useState("");

  // Origen / Destino
  const [origenDir, setOrigenDir] = useState("");
  const [origenLoc, setOrigenLoc] = useState(""); // ✅ NUEVO
  const [origenUrl, setOrigenUrl] = useState("");

  const [destinoDir, setDestinoDir] = useState("");
  const [destinoLoc, setDestinoLoc] = useState(""); // ✅ NUEVO
  const [destinoUrl, setDestinoUrl] = useState("");

  const origenUrlShort = useMemo(() => shortenMapsUrl(origenUrl), [origenUrl]);
  const destinoUrlShort = useMemo(() => shortenMapsUrl(destinoUrl), [destinoUrl]);

  const origenCoords = useMemo(() => parseGoogleMapsLatLng(origenUrlShort), [origenUrlShort]);
  const destinoCoords = useMemo(() => parseGoogleMapsLatLng(destinoUrlShort), [destinoUrlShort]);

  const kmCalc = useMemo(() => {
    const km = haversineKm(origenCoords, destinoCoords);
    return Number.isFinite(km) ? km : 0;
  }, [origenCoords, destinoCoords]);

  // Fotos: 4 auto, 2 lugar, 1 registro, 1 dni
  const [files, setFiles] = useState({
    auto1: null,
    auto2: null,
    auto3: null,
    auto4: null,
    lugar1: null,
    lugar2: null,
    registro: null,
    dni: null,
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // reset open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setQ("");
    setQApplied("");
    setPolizaSel(null);
    setAdhesionId(null);
    setAdhesionLoading(false);

    setMotivo("PRUEBA");
    setNotas("");

    setOrigenDir("");
    setOrigenLoc(""); // ✅ NUEVO
    setOrigenUrl("");

    setDestinoDir("");
    setDestinoLoc(""); // ✅ NUEVO
    setDestinoUrl("");

    setFiles({
      auto1: null,
      auto2: null,
      auto3: null,
      auto4: null,
      lugar1: null,
      lugar2: null,
      registro: null,
      dni: null,
    });
    setSaving(false);
    setErr("");
    const t = setTimeout(() => qRef.current?.focus?.(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // debounce q
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setQApplied(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q, open]);

  // buscar SOLO adheridas
  useEffect(() => {
    if (!open) return;
    if (!qApplied || qApplied.length < 2) return;
    dispatch(buscarPolizasAdheridas({ q: qApplied }));
  }, [dispatch, qApplied, open]);

  // ✅ usar adhesion_id del resultado del buscador
  useEffect(() => {
    if (!open) return;
    if (!polizaSel) return;

    setAdhesionLoading(true);
    const aid = polizaSel?.adhesion_id ?? polizaSel?.adhesionId ?? polizaSel?.adhesion ?? null;

    if (aid) {
      setAdhesionId(Number(aid));
      setAdhesionLoading(false);
      return;
    }

    setAdhesionId(null);
    setAdhesionLoading(false);
    toast.error("Esta póliza no trae adhesion_id. El endpoint debe devolverlo.");
  }, [open, polizaSel]);

  const canStep1 = !!polizaSel && !!adhesionId && !adhesionLoading;

  const canStep2 =
    motivo.trim().length >= 2 &&
    origenLoc.trim().length >= 2 && // ✅ NUEVO
    destinoLoc.trim().length >= 2 && // ✅ NUEVO
    origenDir.trim().length >= 3 &&
    destinoDir.trim().length >= 3 &&
    !!origenCoords &&
    !!destinoCoords &&
    kmCalc > 0;

  const canStep3 = !!(
    files.auto1 &&
    files.auto2 &&
    files.auto3 &&
    files.auto4 &&
    files.lugar1 &&
    files.lugar2 &&
    files.registro &&
    files.dni
  );

  function close() {
    if (saving) return;
    onClose?.();
  }

  function next() {
    if (step === 1 && !canStep1) {
      if (!polizaSel) return toast.error("Elegí una póliza adherida.");
      if (adhesionLoading) return toast.error("Buscando adhesión...");
      return toast.error("No se detectó adhesión activa (adhesion_id).");
    }
    if (step === 2 && !canStep2) {
      if (motivo.trim().length < 2) return toast.error("Ingresá el motivo.");
      if (origenLoc.trim().length < 2) return toast.error("Ingresá la localidad de origen.");
      if (destinoLoc.trim().length < 2) return toast.error("Ingresá la localidad de destino.");
      return toast.error("Completá direcciones + pegá URLs con coordenadas.");
    }
    if (step === 3 && !canStep3) return toast.error("Subí todas las fotos requeridas.");
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    if (saving) return;
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    setErr("");
    if (!canStep1) return toast.error("Falta adhesión.");
    if (!canStep2) return toast.error("Falta motivo/origen/destino.");
    if (!canStep3) return toast.error("Faltan fotos.");

    try {
      setSaving(true);

      // ✅ 1) Subir fotos primero (Cloudinary)
      const uploads = await Promise.all([
        uploadToCloudinary(files.auto1, { folder: "gruas/solicitudes/auto" }),
        uploadToCloudinary(files.auto2, { folder: "gruas/solicitudes/auto" }),
        uploadToCloudinary(files.auto3, { folder: "gruas/solicitudes/auto" }),
        uploadToCloudinary(files.auto4, { folder: "gruas/solicitudes/auto" }),
        uploadToCloudinary(files.lugar1, { folder: "gruas/solicitudes/lugar" }),
        uploadToCloudinary(files.lugar2, { folder: "gruas/solicitudes/lugar" }),
        uploadToCloudinary(files.registro, { folder: "gruas/solicitudes/documentos" }),
        uploadToCloudinary(files.dni, { folder: "gruas/solicitudes/documentos" }),
      ]);

      const toItem = (u) => ({
        url: (u?.secure_url || u?.url || "").trim(),
        public_id: (u?.public_id || "").trim(),
      });

      const auto = [uploads[0], uploads[1], uploads[2], uploads[3]].map(toItem);
      const lugar = [uploads[4], uploads[5]].map(toItem);
      const documentos = [
        { ...toItem(uploads[6]), tipo: "registro" },
        { ...toItem(uploads[7]), tipo: "dni" },
      ];

      // Validación rápida antes de pegarle al backend
      const all = [...auto, ...lugar, documentos[0], documentos[1]];
      if (all.some((x) => !x.url || !x.public_id)) {
        throw new Error("Alguna foto no subió bien a Cloudinary (faltan url/public_id).");
      }

      // ✅ 2) Formato que espera el backend
      const fotos_input = { auto, lugar, documentos };

      // ✅ 3) Crear solicitud enviando las fotos al backend
      const payload = {
        adhesion_id: Number(adhesionId),
        motivo: motivo.trim(),
        notas: (notas || "").trim(),

        // ✅ NUEVO
        origen_localidad: origenLoc.trim(),
        destino_localidad: destinoLoc.trim(),

        origen_direccion: origenDir.trim(),
        origen_maps_url: origenUrlShort.trim(),
        destino_direccion: destinoDir.trim(),
        destino_maps_url: destinoUrlShort.trim(),
        fotos_input,
      };

      const created = await dispatch(createSolicitud(payload)).unwrap();

      toast.success("Solicitud creada.");
      onCreated?.(created);
      onClose?.();
    } catch (e) {
      const msg = e?.data?.detail || e?.message || "Error creando solicitud";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          <motion.div
            className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-100">Solicitar grúa</div>
                <div className="text-xs text-slate-500">Paso {step} de 3 · Solo pólizas adheridas.</div>
              </div>

              <button
                onClick={close}
                disabled={saving}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {step === 1 ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-100">1) Buscar póliza adherida</div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        ref={qRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Patente / asegurado / DNI / compañía…"
                        className={classNames(
                          "w-full rounded-xl pl-9 pr-3 py-2 text-sm",
                          "bg-slate-900 border border-slate-800 text-slate-100",
                          "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                        )}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {polizasStatus === "loading" ? <div className="text-xs text-slate-400">Buscando…</div> : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(polizas || []).map((p) => {
                      const active =
                        (polizaSel?.id || polizaSel?.poliza_id) === (p?.id || p?.poliza_id);
                      return (
                        <button
                          type="button"
                          key={p?.id || p?.poliza_id}
                          onClick={() => setPolizaSel(p)}
                          className={classNames(
                            "text-left rounded-2xl border p-3",
                            active
                              ? "border-emerald-800 bg-emerald-950/30"
                              : "border-slate-800 bg-slate-950 hover:bg-slate-900"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <PolizaLine p={p} />
                            {active ? <HiCheckCircle className="h-5 w-5 text-emerald-300 shrink-0" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!polizas?.length && qApplied?.length >= 2 ? (
                    <div className="text-sm text-slate-400">Sin resultados.</div>
                  ) : null}

                  {polizaSel ? (
                    <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-xs text-slate-400">Seleccionada</div>
                      <div className="mt-0.5">
                        <PolizaLine p={polizaSel} />
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500">
                        Adhesión:{" "}
                        {adhesionLoading ? (
                          <span className="text-slate-300">buscando…</span>
                        ) : adhesionId ? (
                          <span className="text-emerald-300 font-semibold">#{adhesionId}</span>
                        ) : (
                          <span className="text-red-300">no detectada</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-slate-100">2) Motivo + Origen y destino</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-xs text-slate-400 mb-1">Motivo</div>
                      <input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className={classNames(
                          "w-full rounded-xl px-3 py-2 text-sm",
                          "bg-slate-900 border border-slate-800 text-slate-100",
                          "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                        )}
                        placeholder="Ej: Pinchadura / Batería / Accidente…"
                        disabled={saving}
                      />

                      <div className="text-xs text-slate-400 mt-3 mb-1">Notas (opcional)</div>
                      <textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className={classNames(
                          "w-full rounded-xl px-3 py-2 text-sm min-h-[90px]",
                          "bg-slate-900 border border-slate-800 text-slate-100",
                          "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                        )}
                        placeholder="Detalle breve para el proveedor…"
                        disabled={saving}
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-xs text-slate-400">Tip</div>
                      <div className="text-sm text-slate-200 mt-1">
                        Pegá links de Google Maps con{" "}
                        <span className="text-slate-100 font-semibold">@lat,lng</span> o{" "}
                        <span className="text-slate-100 font-semibold">q=lat,lng</span>. (Los acorto
                        automáticamente para que no fallen por largo.)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                        <HiLocationMarker className="h-4 w-4" />
                        Origen
                      </div>

                      {/* ✅ NUEVO */}
                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">Localidad</div>
                        <input
                          value={origenLoc}
                          onChange={(e) => setOrigenLoc(e.target.value)}
                          className={classNames(
                            "w-full rounded-xl px-3 py-2 text-sm",
                            "bg-slate-900 border border-slate-800 text-slate-100",
                            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                          )}
                          placeholder="Ej: Ramos Mejía"
                          disabled={saving}
                        />
                      </label>

                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">Dirección (manual)</div>
                        <input
                          value={origenDir}
                          onChange={(e) => setOrigenDir(e.target.value)}
                          className={classNames(
                            "w-full rounded-xl px-3 py-2 text-sm",
                            "bg-slate-900 border border-slate-800 text-slate-100",
                            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                          )}
                          placeholder="Ej: Av. Rivadavia 1234"
                          disabled={saving}
                        />
                      </label>

                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">URL Google Maps (con coords)</div>
                        <div className="relative">
                          <HiLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            value={origenUrl}
                            onChange={(e) => setOrigenUrl(e.target.value)}
                            className={classNames(
                              "w-full rounded-xl pl-9 pr-3 py-2 text-sm",
                              "bg-slate-900 border border-slate-800 text-slate-100",
                              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                            )}
                            placeholder="Pegá el link de Google Maps…"
                            disabled={saving}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Usando: <span className="text-slate-300 break-all">{origenUrlShort || "—"}</span>
                        </div>
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                        <HiLocationMarker className="h-4 w-4" />
                        Destino
                      </div>

                      {/* ✅ NUEVO */}
                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">Localidad</div>
                        <input
                          value={destinoLoc}
                          onChange={(e) => setDestinoLoc(e.target.value)}
                          className={classNames(
                            "w-full rounded-xl px-3 py-2 text-sm",
                            "bg-slate-900 border border-slate-800 text-slate-100",
                            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                          )}
                          placeholder="Ej: Morón"
                          disabled={saving}
                        />
                      </label>

                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">Dirección (manual)</div>
                        <input
                          value={destinoDir}
                          onChange={(e) => setDestinoDir(e.target.value)}
                          className={classNames(
                            "w-full rounded-xl px-3 py-2 text-sm",
                            "bg-slate-900 border border-slate-800 text-slate-100",
                            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                          )}
                          placeholder="Ej: Belgrano 110"
                          disabled={saving}
                        />
                      </label>

                      <label className="block mt-2">
                        <div className="text-xs text-slate-400 mb-1">URL Google Maps (con coords)</div>
                        <div className="relative">
                          <HiLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            value={destinoUrl}
                            onChange={(e) => setDestinoUrl(e.target.value)}
                            className={classNames(
                              "w-full rounded-xl pl-9 pr-3 py-2 text-sm",
                              "bg-slate-900 border border-slate-800 text-slate-100",
                              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                            )}
                            placeholder="Pegá el link de Google Maps…"
                            disabled={saving}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Usando: <span className="text-slate-300 break-all">{destinoUrlShort || "—"}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">Kilómetros (estimado)</div>
                      <div className="text-lg font-semibold text-slate-100">
                        {kmCalc > 0 ? `${kmCalc.toFixed(2)} km` : "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">Calculado por coordenadas.</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!origenCoords) return toast.error("URL de origen sin coordenadas.");
                        if (!destinoCoords) return toast.error("URL de destino sin coordenadas.");
                        toast.success("Coordenadas OK.");
                      }}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      disabled={saving}
                    >
                      Validar links
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-100">3) Fotos requeridas (Cloudinary)</div>
                  <div className="text-xs text-slate-500">4 del auto · 2 del lugar · 1 registro · 1 DNI</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <UploadField label="Auto 1" file={files.auto1} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, auto1: f }))} />
                    <UploadField label="Auto 2" file={files.auto2} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, auto2: f }))} />
                    <UploadField label="Auto 3" file={files.auto3} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, auto3: f }))} />
                    <UploadField label="Auto 4" file={files.auto4} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, auto4: f }))} />
                    <UploadField label="Lugar 1" file={files.lugar1} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, lugar1: f }))} />
                    <UploadField label="Lugar 2" file={files.lugar2} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, lugar2: f }))} />
                    <UploadField label="Registro" file={files.registro} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, registro: f }))} />
                    <UploadField label="DNI" file={files.dni} disabled={saving} onChange={(f) => setFiles((p) => ({ ...p, dni: f }))} />
                  </div>

                  {err ? (
                    <div className="text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
                      {err}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-800 p-4">
              <div className="text-xs text-slate-500">
                {polizaSel ? (
                  <>
                    Póliza:{" "}
                    <span className="text-slate-200">
                      {(polizaSel?.patente || "").toString().toUpperCase() || "—"}
                    </span>
                    {adhesionId ? (
                      <>
                        {" "}
                        · <span className="text-emerald-300">Adhesión #{adhesionId}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </div>

              <div className="flex items-center gap-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={back}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl text-sm border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Atrás
                  </button>
                ) : null}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={next}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl text-sm border border-slate-100 bg-slate-100 text-slate-900 hover:opacity-90 disabled:opacity-50"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl text-sm border border-emerald-800 bg-emerald-950 text-emerald-200 hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Creando..." : "Crear solicitud"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function UploadField({ label, file, onChange, disabled }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        {file ? (
          <button
            type="button"
            onClick={() => onChange?.(null)}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            title="Quitar"
          >
            <HiTrash className="h-4 w-4" />
            Quitar
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label
          className={classNames(
            "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border cursor-pointer",
            disabled
              ? "border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed"
              : "border-slate-100 bg-slate-100 text-slate-900 hover:opacity-90"
          )}
        >
          <HiUpload className="h-4 w-4" />
          Elegir foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.files?.[0] || null)}
          />
        </label>

        <div className="min-w-0 text-[11px] text-slate-500 truncate">{file?.name || "Sin archivo"}</div>
      </div>
    </div>
  );
}
