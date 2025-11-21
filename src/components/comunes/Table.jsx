// components/Table.jsx
const Table = ({ headers, children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse bg-white dark:bg-gray-900 text-black dark:text-white">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b dark:border-gray-700 p-3 font-semibold">
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
  