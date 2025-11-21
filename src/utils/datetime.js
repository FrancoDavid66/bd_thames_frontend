export const pad = (n) => String(n).padStart(2, '0');
export const fmtDateTime = (d) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
export const timeLeft = (finISO) => {
  if (!finISO) return null;
  const fin = new Date(finISO);
  const diff = fin.getTime() - Date.now();
  if (diff <= 0) return 'vencido';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m restantes`;
};
