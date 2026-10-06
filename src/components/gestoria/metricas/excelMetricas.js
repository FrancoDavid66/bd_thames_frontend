// src/components/gestoria/metricas/excelMetricas.js
//
// 📥 «Descargar Excel» de Métricas: arma el archivo en el navegador con lo que ya
// está en pantalla (una hoja por parte). La plata va solo si el servidor la mandó
// (o sea, solo para el admin). ExcelJS se carga recién al tocar el botón (pesa).
//
// Ej: Gestoria_Metricas_2026-09_Todas.xlsx → Resumen · Mes a mes · Tipos · Tiempos ·
//     Oficinas · Gestores · Listos para entregar · Plata
import { MESES, claveMes, mayuscula } from "./metricasUtils";

const VIOLETA = "FF5B52E6";
const num = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

function hoja(wb, nombre, columnas, filas) {
  const ws = wb.addWorksheet(nombre);
  ws.columns = columnas.map(([header, key, width, formato]) => ({ header, key, width, style: formato ? { numFmt: formato } : {} }));
  ws.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIOLETA } };
    c.alignment = { vertical: "middle" };
  });
  ws.getRow(1).height = 20;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  filas.forEach((f) => ws.addRow(f));
  return ws;
}

const PESOS = '"$" #,##0';
const DIAS = "0.0";

export async function descargarExcelMetricas(d) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "THAMES";
  wb.created = new Date();

  const p = d.periodo;
  const mesNombre = `${mayuscula(MESES[p.mes - 1])} ${p.anio}`;
  const n = d.numeros;
  const a = d.anterior;
  const oficina = d.filtros?.oficina_nombre || "Todas";
  const gestor = d.filtros?.gestor_nombre || "Todos";

  const antNombre = `${mayuscula(p.anterior.nombre)}${a.a_esta_altura ? " (a esta altura)" : ""}`;
  hoja(wb, "Resumen", [["Dato", "dato", 38], [mesNombre, "v", 18], [antNombre, "a", 24]], [
    { dato: "Oficina", v: oficina },
    { dato: "Gestor", v: gestor },
    { dato: "Trámites cargados (sin cancelados)", v: n.cargados, a: a.cargados },
    { dato: "Entregados", v: n.entregados, a: a.entregados },
    { dato: "Quedaron LISTO", v: n.listos, a: a.listos },
    { dato: "Días hasta LISTO (promedio)", v: num(n.dias_hasta_listo), a: num(a.dias_hasta_listo) },
    { dato: "Observados (de los cargados)", v: n.observados, a: a.observados },
    { dato: "% observados", v: num(n.observados_pct), a: num(a.observados_pct) },
    { dato: "Abiertos hoy", v: n.abiertos },
    { dato: `Demorados hoy (${d.dias_demorado} días o más)`, v: n.demorados },
    { dato: "Listos sin retirar hoy", v: n.listos_sin_retirar },
    { dato: "Cargados por un gestor desde su usuario", v: n.cargados_por_gestor },
  ]);

  hoja(wb, "Mes a mes", [["Mes", "mes", 18], ["Cargados", "c", 12], ["Entregados", "e", 12]],
    (d.mes_a_mes || []).map((x) => ({ mes: `${mayuscula(x.nombre)} ${x.anio}`, c: x.cargados, e: x.entregados })));

  hoja(wb, "Tipos", [["Tipo de trámite", "t", 32], ["Cargados", "n", 12], ["%", "pct", 8]],
    (d.tipos || []).map((x) => ({ t: x.nombre, n: x.n, pct: x.pct })));

  hoja(
    wb,
    "Tiempos",
    [
      ["Tipo de trámite", "t", 30], ["Quedaron LISTO", "n", 15], ["Hasta presentarlo (días)", "pres", 22, DIAS],
      ["En el registro (días)", "reg", 20, DIAS], ["Hasta LISTO (días)", "tot", 18, DIAS], ["Lo esperado (días)", "esp", 18],
      ["Esperando que lo retiren (días)", "ret", 28, DIAS], ["Ya retirados", "retirados", 13],
    ],
    (d.tiempos || []).map((x) => ({
      t: x.nombre, n: x.n, pres: num(x.hasta_presentar), reg: num(x.en_registro), tot: num(x.hasta_listo),
      esp: num(x.esperado), ret: num(x.retiro), retirados: x.retirados,
    }))
  );

  if (d.oficinas) {
    hoja(
      wb,
      "Oficinas",
      [["Oficina", "o", 22], ["Cargados", "c", 12], ["Listos sin retirar (hoy)", "l", 24], ["Los retiran en (días, promedio)", "r", 30, DIAS]],
      d.oficinas.map((x) => ({ o: x.nombre, c: x.cargados, l: x.listos_sin_retirar, r: num(x.retiro_promedio) }))
    );
  }

  const conPlata = !!d.con_plata;
  const colsGestores = [
    ["Gestor", "g", 26], ["Derivados", "der", 12], ["Abiertos (hoy)", "abi", 15], ["Entregados", "ent", 12],
    ["Días hasta LISTO", "dias", 17, DIAS], ["Observados", "obs", 12], ["% observados", "obsp", 14], ["Demorados (hoy)", "dem", 16],
  ];
  if (conPlata) {
    colsGestores.push(
      ["Precio (gestoría)", "precio", 18, PESOS], ["Le pagaron", "cobrado", 16, PESOS],
      ["Comisión THAMES", "com", 18, PESOS], ["Comisión cobrada", "comc", 18, PESOS]
    );
  }
  hoja(
    wb,
    "Gestores",
    colsGestores,
    (d.gestores || []).map((x) => ({
      g: x.nombre, der: x.derivados, abi: x.abiertos, ent: x.entregados, dias: num(x.dias_hasta_listo),
      obs: x.observados, obsp: num(x.observados_pct), dem: x.demorados,
      ...(conPlata && x.plata
        ? { precio: num(x.plata.precio), cobrado: num(x.plata.cobrado), com: num(x.plata.comision), comc: num(x.plata.comision_cobrada) }
        : {}),
    }))
  );

  if (d.listos_para_entregar?.tramites?.length) {
    hoja(
      wb,
      "Listos para entregar",
      [["Trámite", "num", 16], ["Patente", "pat", 12], ["Tipo", "tipo", 26], ["Cliente", "cli", 28], ["Oficina", "ofi", 16], ["Listo hace (días)", "dias", 16]],
      d.listos_para_entregar.tramites.map((t) => ({
        num: t.numero, pat: t.con_vehiculo ? t.patente : "", tipo: `${t.tipo_corto}${t.detalle ? ` ${t.detalle}` : ""}`,
        cli: t.persona_nombre, ofi: t.oficina_nombre, dias: t.dias,
      }))
    );
  }

  if (conPlata && d.plata) {
    const pl = d.plata;
    hoja(wb, "Plata", [["Dato (trámites cargados en el mes)", "dato", 40], ["Monto", "v", 18, PESOS]], [
      { dato: "Lo que cobran los gestores (precio)", v: num(pl.precio) },
      { dato: "Los clientes ya les pagaron", v: num(pl.cobrado) },
      { dato: "Falta que paguen los clientes", v: num(pl.falta_cobrar_clientes) },
      { dato: "Comisión de THAMES", v: num(pl.comision) },
      { dato: "Comisión cobrada", v: num(pl.comision_cobrada) },
      { dato: "Comisión que falta cobrar", v: num(pl.comision_falta) },
    ]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const partes = ["Gestoria_Metricas", claveMes(p), oficina, d.filtros?.gestor_nombre || ""].filter(Boolean);
  const nombre = `${partes.join("_").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_")}.xlsx`;
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return nombre;
}
