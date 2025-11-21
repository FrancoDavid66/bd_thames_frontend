// src/components/polizas/documentos/DocPreviewModal.jsx
// ✅ visor con zoom/pan — mantiene tu lógica, mejora bordes/contrastes
import { useEffect, useRef, useState } from "react";
import {
  HiX,
  HiPlus,
  HiMinus,
  HiRefresh,
  HiPhotograph,
  HiDocumentText,
  HiDownload,
} from "react-icons/hi";
import { guessMimeByName, isImageMime } from "./DocUtils";

export default function DocPreviewModal({ doc, onClose }) {
  if (!doc) return null;
  const mime = doc?.mime || guessMimeByName(doc?.nombre || doc?.url);
  const isImg = isImageMime(mime);

  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef({ active: false, dist: 0 });

  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
    setPanning(false);
    pinchRef.current = { active: false, dist: 0 };
  }, [doc?.id, doc?.url]);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const ZSTEP = 0.2,
    MIN = 1,
    MAX = 5;

  function zoom(delta) {
    setScale((prev) => clamp(prev + delta, MIN, MAX));
  }
  function onWheel(e) {
    e.preventDefault();
    zoom(e.deltaY < 0 ? +ZSTEP : -ZSTEP);
  }
  function onMouseDown(e) {
    if (e.button !== 0) return;
    setPanning(true);
    lastPointRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e) {
    if (!panning) return;
    const dx = e.clientX - lastPointRef.current.x;
    const dy = e.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
  }
  function endPan() {
    setPanning(false);
  }
  function dist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      setPanning(true);
      lastPointRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2) {
      pinchRef.current.active = true;
      pinchRef.current.dist = dist(e.touches[0], e.touches[1]);
    }
  }
  function onTouchMove(e) {
    if (pinchRef.current.active && e.touches.length === 2) {
      const newDist = dist(e.touches[0], e.touches[1]);
      const delta = (newDist - pinchRef.current.dist) / 200;
      pinchRef.current.dist = newDist;
      zoom(delta);
    } else if (panning && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - lastPointRef.current.x;
      const dy = t.clientY - lastPointRef.current.y;
      lastPointRef.current = { x: t.clientX, y: t.clientY };
      setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  }
  function onTouchEnd() {
    pinchRef.current.active = false;
    setPanning(false);
  }
  function onDoubleClick() {
    if (scale === 1) setScale(2.5);
    else {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  }

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <header className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              {isImg ? (
                <HiPhotograph className="opacity-80" />
              ) : (
                <HiDocumentText className="opacity-80" />
              )}
              <h3 className="text-base font-semibold truncate max-w-[70vw]">
                {doc?.nombre || doc?.url?.split("/").pop() || "Documento"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isImg && (
                <>
                  <button
                    onClick={() => zoom(-ZSTEP)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
                  >
                    <HiMinus />
                  </button>
                  <button
                    onClick={() => zoom(+ZSTEP)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
                  >
                    <HiPlus />
                  </button>
                  <button
                    onClick={() => {
                      setScale(1);
                      setPos({ x: 0, y: 0 });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
                  >
                    <HiRefresh />
                  </button>
                </>
              )}
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
              >
                <HiDownload />
              </a>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
              >
                <HiX />
              </button>
            </div>
          </header>

          <div className="p-3">
            {isImg ? (
              <div
                ref={containerRef}
                className={`relative w-full h-[78vh] max-h-[78vh] overflow-hidden rounded-xl border border-white/10 bg-black/50 ${
                  panning ? "cursor-grabbing" : "cursor-grab"
                }`}
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={endPan}
                onMouseLeave={endPan}
                onDoubleClick={onDoubleClick}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <img
                  src={doc.url}
                  alt={doc?.nombre || "imagen"}
                  draggable={false}
                  className="select-none pointer-events-none absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%,-50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                />
              </div>
            ) : (
              <div className="h-[78vh] rounded-xl border border-white/10 overflow-hidden bg-black/50">
                <iframe
                  src={`${doc.url}#view=FitH`}
                  title={doc?.nombre || "documento"}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
