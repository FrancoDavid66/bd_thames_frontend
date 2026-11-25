// src/components/login/EscenaLogin3D.jsx
//
// 🎬 LA ESCENA 3D DEL LOGIN (25/11/2026) — la T de la web de Thames, en 3D y animada.
//
//   · Al abrir (cambio de Franco 25/11, «la intro se ve mal»): ya NO vuelan las piezas.
//     La T aparece suave: se ilumina de a poco, se acerca un poquito y gira hasta quedar de frente.
//   · Después flota y se mece despacio; sigue un poco al mouse (o al dedo).
//   · Mientras entra («Entrando…»): da vueltas suaves.  · Clave mal: un temblorcito.
//   · Marca MALVINAS: en vez de la T, una moneda 3D con su logo (verde y amarillo).
//
// Se carga aparte (lazy) para no hacer más pesada la app: three.js solo se baja en el login.
// Si la compu no tiene 3D (WebGL), avisa con onFalla() y el login muestra la T plana.
// «Reducir movimiento» del sistema: la T aparece armada y quieta.
import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { tSvgCompleto } from "./tThames";

// La entrada: cuánto dura (s) y desde dónde arranca (más atrás y girada).
const ENTRADA_S = 1.9;
const ENTRADA_GIRO = -0.75;
const ENTRADA_Z = -2.2;

const PALETAS = {
  thames: { pieza: "#C1121F", rim: 0xff2b3d, rim2: 0xff5060, fill: 0xff4655, polvo: "#FF4655", polvo2: "#FFFFFF", piso: "255,43,61" },
  malvinas: { pieza: "#1E6B2E", rim: 0x2f9e4f, rim2: 0xf2d91b, fill: 0x2f9e4f, polvo: "#2F9E4F", polvo2: "#F2D91B", piso: "47,158,79" },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function texturaPunto() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

function texturaPiso(rgb) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${rgb},.55)`);
  g.addColorStop(0.45, `rgba(${rgb},.18)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

/** Las 7 piezas de la T, centradas. Devuelve { piezas:[{geo, home, dir}], ancho } o null. */
function armarT() {
  try {
    const data = new SVGLoader().parse(tSvgCompleto());
    const geos = data.paths.map(
      (path) =>
        new ExtrudeGeometry(SVGLoader.createShapes(path), {
          depth: 80,
          bevelEnabled: true,
          bevelThickness: 12,
          bevelSize: 7,
          bevelSegments: 4,
          curveSegments: 40,
        })
    );
    const bb = new Box3();
    geos.forEach((g) => {
      g.computeBoundingBox();
      bb.union(g.boundingBox);
    });
    const centro = bb.getCenter(new Vector3());
    const piezas = geos.map((g) => {
      g.translate(-centro.x, -centro.y, -centro.z);
      g.computeBoundingBox();
      const pc = g.boundingBox.getCenter(new Vector3());
      g.translate(-pc.x, -pc.y, -pc.z);
      return { geo: g, home: pc.clone(), dir: pc.clone().setZ(0).normalize() };
    });
    return piezas.length === 7 ? { piezas, ancho: bb.max.x - bb.min.x } : null;
  } catch {
    return null;
  }
}

/** Cara de la moneda de Malvinas: fondo amarillo, borde verde y el logo al medio. */
function texturaMoneda(logoUrl, alListo) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  const pintar = (img) => {
    x.clearRect(0, 0, 512, 512);
    x.fillStyle = "#F2D91B";
    x.beginPath();
    x.arc(256, 256, 256, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = 22;
    x.strokeStyle = "#1E6B2E";
    x.beginPath();
    x.arc(256, 256, 236, 0, Math.PI * 2);
    x.stroke();
    if (img) {
      const lado = 330;
      const r = Math.min(lado / img.width, lado / img.height);
      const w = img.width * r;
      const h = img.height * r;
      x.drawImage(img, 256 - w / 2, 256 - h / 2, w, h);
    }
  };
  pintar(null);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  if (logoUrl) {
    const img = new Image();
    img.onload = () => {
      pintar(img);
      tex.needsUpdate = true;
      alListo?.();
    };
    img.src = logoUrl;
  }
  return tex;
}

export default function EscenaLogin3D({ modo = "thames", logoUrl = "", ocupado = false, errores = 0, onFalla }) {
  const caja = useRef(null);
  const vivo = useRef({ ocupado, sacudir: -10 });
  vivo.current.ocupado = ocupado;

  // Clave mal → la T se sacude (no al abrir).
  useEffect(() => {
    if (errores > 0) vivo.current.sacudir = performance.now() / 1000;
  }, [errores]);

  useEffect(() => {
    const cont = caja.current;
    if (!cont) return undefined;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pal = PALETAS[modo] || PALETAS.thames;

    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFalla?.();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const lienzo = renderer.domElement;
    lienzo.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
    lienzo.setAttribute("aria-hidden", "true");
    cont.appendChild(lienzo);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(0, 0, 14);
    const pmrem = new PMREMGenerator(renderer);
    const ambiente = new RoomEnvironment();
    const envTex = pmrem.fromScene(ambiente, 0.04).texture;
    scene.environment = envTex;

    scene.add(new HemisphereLight(0xffffff, 0x1a1012, 0.55));
    const key = new DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 8, 7);
    const rim = new DirectionalLight(pal.rim, 2.6);
    rim.position.set(-7, 3, -6);
    const rim2 = new DirectionalLight(pal.rim2, 1.2);
    rim2.position.set(8, -2, -4);
    const fill = new PointLight(pal.fill, 0.9, 40);
    fill.position.set(0, -3, 7);
    scene.add(key, rim, rim2, fill);

    const desechar = []; // geometrías, materiales y texturas para liberar al salir

    // ── El protagonista: la T (o la moneda de Malvinas) ──
    const raiz = new Group();
    scene.add(raiz);
    const interior = new Group();
    raiz.add(interior);
    const fundir = []; // materiales que aparecen de a poco (se vuelven opacos al terminar)

    if (modo === "malvinas") {
      const cara = texturaMoneda(logoUrl);
      const caraMat = new MeshStandardMaterial({ map: cara, roughness: 0.4, metalness: 0.15, transparent: true, opacity: 0 });
      const cantoMat = new MeshPhysicalMaterial({ color: pal.pieza, metalness: 0.6, roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0 });
      fundir.push(caraMat, cantoMat);
      const geo = new CylinderGeometry(2.4, 2.4, 0.36, 96);
      const moneda = new Mesh(geo, [cantoMat, caraMat, caraMat]);
      const giro = new Group();
      giro.rotation.x = Math.PI / 2;
      moneda.rotation.y = -Math.PI / 2; // el logo derecho mirando a la cámara
      giro.add(moneda);
      interior.add(giro);
      desechar.push(geo, caraMat, cantoMat, cara);
    } else {
      const t = armarT();
      if (!t) {
        onFalla?.();
      } else {
        interior.rotation.x = Math.PI; // el SVG tiene la Y para abajo
        interior.scale.setScalar(6 / t.ancho);
        const mat = new MeshPhysicalMaterial({
          transparent: true,
          opacity: 0,
          color: pal.pieza,
          metalness: 0.55,
          roughness: 0.22,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          envMapIntensity: 1.25,
        });
        desechar.push(mat);
        fundir.push(mat);
        t.piezas.forEach((p) => {
          const m = new Mesh(p.geo, mat);
          m.position.copy(p.home);
          interior.add(m);
          desechar.push(p.geo);
        });
      }
    }

    // ── Brillo en el piso ──
    const pisoTex = texturaPiso(pal.piso);
    const pisoMat = new MeshBasicMaterial({ map: pisoTex, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const pisoGeo = new PlaneGeometry(9, 2.2);
    const piso = new Mesh(pisoGeo, pisoMat);
    piso.position.set(0, -3.1, -0.6);
    scene.add(piso);
    desechar.push(pisoTex, pisoMat, pisoGeo);

    // ── Polvo de colores ──
    const punto = texturaPunto();
    desechar.push(punto);
    const polvo = (n, color, size, opacidad, semilla) => {
      let s = semilla;
      const azar = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i += 1) {
        pos[i * 3] = (azar() - 0.5) * 22;
        pos[i * 3 + 1] = (azar() - 0.5) * 13;
        pos[i * 3 + 2] = -9 + azar() * 13;
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      const m = new PointsMaterial({ color, size, map: punto, transparent: true, opacity: opacidad, depthWrite: false, toneMapped: false });
      const p = new Points(g, m);
      p.userData.opacidad = opacidad;
      m.opacity = 0;
      scene.add(p);
      desechar.push(g, m);
      return p;
    };
    const polvoA = polvo(420, pal.polvo, 0.14, 0.8, 7);
    const polvoB = polvo(220, pal.polvo2, 0.07, 0.55, 13);

    // ── Tamaño ──
    let ajuste = 1;
    let baseY = 0.15;
    const medir = () => {
      const w = cont.clientWidth || 1;
      const h = cont.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Que la T entre a lo ancho (en un celu angosto se achica) y no tape el texto de abajo.
      const anchoVisible = 2 * 14 * Math.tan(MathUtils.degToRad(17.5)) * camera.aspect;
      ajuste = Math.min(1, (anchoVisible * 0.72) / 6);
      baseY = h < 360 ? 0 : 0.15;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);

    // ── Mouse / dedo ──
    const mouse = { x: 0, y: 0 };
    const suave = { x: 0, y: 0 };
    const alMover = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", alMover, { passive: true });

    // ── Animación ──
    let t0 = null;
    let aparecida = false;
    let ultimo = 0;
    let giro = 0;
    let velGiro = 0;
    let raf = 0;
    let cuadros = 0;
    const cuadro = (ms) => {
      const t = ms / 1000;
      // El reloj de la entrada arranca recién cuando ya se dibujó el primer cuadro (armar los
      // brillos la primera vez tarda; si no, la T aparecería de golpe, ya entera).
      if (cuadros < 2) {
        t0 = t;
        ultimo = t;
      }
      cuadros += 1;
      const dt = Math.min(0.05, t - ultimo);
      ultimo = t;
      const tt = quieto ? 0 : t;
      suave.x += (mouse.x - suave.x) * 0.06;
      suave.y += (mouse.y - suave.y) * 0.06;

      // Entrando: vueltas suaves. Después vuelve sola a mirar al frente.
      if (vivo.current.ocupado && !quieto) {
        velGiro += (3.2 - velGiro) * Math.min(1, dt * 2);
        giro += velGiro * dt;
      } else {
        velGiro = 0;
        const destino = Math.round(giro / (Math.PI * 2)) * Math.PI * 2;
        giro += (destino - giro) * Math.min(1, dt * 2.5);
      }

      // Aparición: de 0 a 1 en ENTRADA_S segundos (con «reducir movimiento», ya está).
      const ap = quieto ? 1 : eOutCubic(clamp((t - t0 - 0.15) / ENTRADA_S));
      if (!aparecida) {
        fundir.forEach((m) => {
          m.opacity = ap;
        });
        pisoMat.opacity = ap;
        polvoA.material.opacity = polvoA.userData.opacidad * ap;
        polvoB.material.opacity = polvoB.userData.opacidad * ap;
        if (ap >= 1) {
          aparecida = true;
          fundir.forEach((m) => {
            m.transparent = false;
            m.opacity = 1;
            m.needsUpdate = true;
          });
        }
      }

      raiz.position.y = baseY + Math.sin(tt * 0.9) * 0.07 * ap;
      raiz.position.z = ENTRADA_Z * (1 - ap);
      raiz.rotation.y = (Math.sin(tt * 0.35) * 0.22 + suave.x * 0.35) * ap + ENTRADA_GIRO * (1 - ap) + giro;
      raiz.rotation.x = 0.04 - suave.y * 0.14 * ap;
      const ds = t - vivo.current.sacudir;
      raiz.rotation.z = ds >= 0 && ds < 0.5 ? Math.sin(ds * 30) * 0.05 * (1 - ds / 0.5) : 0;
      raiz.scale.setScalar(ajuste * (0.9 + 0.1 * ap));

      polvoA.rotation.y = tt * 0.012;
      polvoA.position.y = Math.sin(tt * 0.2) * 0.3;
      polvoB.rotation.y = -tt * 0.009;
      camera.position.x += (suave.x * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (-suave.y * 0.3 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(cuadro);
    };
    try {
      renderer.compile(scene, camera); // prepara los brillos antes de arrancar
    } catch {
      /* si no se puede, se prepara solo en el primer cuadro */
    }
    raf = requestAnimationFrame(cuadro);

    // Pestaña escondida: no gasta batería.
    const alCambiarVista = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        ultimo = performance.now() / 1000;
        raf = requestAnimationFrame(cuadro);
      }
    };
    document.addEventListener("visibilitychange", alCambiarVista);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", alMover);
      document.removeEventListener("visibilitychange", alCambiarVista);
      desechar.forEach((x) => x.dispose?.());
      envTex.dispose();
      pmrem.dispose();
      ambiente.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      lienzo.remove();
    };
    // onFalla y logoUrl son estables (vienen de la marca); la escena se arma una sola vez por marca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  return <div ref={caja} className="absolute inset-0" />;
}
