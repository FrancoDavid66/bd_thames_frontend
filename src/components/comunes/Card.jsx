// components/Card.jsx
const Card = ({ title, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl shadow p-6 transition-colors duration-300">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default Card
