// components/Card.jsx
const Card = ({ title, children }) => {
  return (
    <div className="bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark rounded-xl border border-linea dark:border-linea-dark p-6 transition-colors duration-300">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default Card
