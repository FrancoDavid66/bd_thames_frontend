// components/Table.jsx
const Table = ({ headers, children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b border-linea dark:border-linea-dark p-3 text-[12px] font-medium text-suave dark:text-suave-dark">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
  
  export default Table
  