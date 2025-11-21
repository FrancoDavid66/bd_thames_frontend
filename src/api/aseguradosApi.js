// src/api/aseguradosApi.js
export async function listAsegurados({ page = 1, pageSize = 20, search = "", ordering = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("page_size", pageSize);
  if (search) params.set("search", search);
  if (ordering) params.set("ordering", ordering);

  const res = await fetch(`/sheet/asegurados/?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}
