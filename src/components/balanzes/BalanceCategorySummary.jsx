const agruparPorCategoria = (items = []) => {
    const resumen = {};
  
    items.forEach(({ categoria, monto }) => {
      const key = categoria || 'Sin categoría';
      if (!resumen[key]) resumen[key] = 0;
      resumen[key] += parseFloat(monto);
    });
  
    return Object.entries(resumen).map(([cat, total]) => ({
      categoria: cat,
      total: total.toFixed(2),
    }));
  };
  
  const BalanceCategorySummary = ({ ingresos = [], egresos = [] }) => {
    const ingresosPorCategoria = agruparPorCategoria(ingresos);
    const egresosPorCategoria = agruparPorCategoria(egresos);
  
    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-white mb-4">🧾 Resumen por Categoría</h3>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ingresos */}
          <div>
            <h4 className="font-semibold mb-2 text-green-600">Ingresos</h4>
            <ul className="space-y-1">
              {ingresosPorCategoria.map((item) => (
                <li key={item.categoria} className="flex justify-between">
                  <span>{item.categoria}</span>
                  <span className="font-semibold text-green-600">${item.total}</span>
                </li>
              ))}
              {ingresosPorCategoria.length === 0 && (
                <li className="text-sm text-zinc-500">Sin ingresos registrados</li>
              )}
            </ul>
          </div>
  
          {/* Egresos */}
          <div>
            <h4 className="font-semibold mb-2 text-red-600">Egresos</h4>
            <ul className="space-y-1">
              {egresosPorCategoria.map((item) => (
                <li key={item.categoria} className="flex justify-between">
                  <span>{item.categoria}</span>
                  <span className="font-semibold text-red-600">${item.total}</span>
                </li>
              ))}
              {egresosPorCategoria.length === 0 && (
                <li className="text-sm text-zinc-500">Sin egresos registrados</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };
  
  export default BalanceCategorySummary;
  