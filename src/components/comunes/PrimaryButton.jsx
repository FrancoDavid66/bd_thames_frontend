const PrimaryButton = ({ children, onClick, type = 'button' }) => {
    return (
      <button
        type={type}
        onClick={onClick}
        className="bg-duo-azul hover:brightness-110 text-white px-5 py-2 rounded-lg font-medium transition-colors"
      >
        {children}
      </button>
    )
  }
  
  export default PrimaryButton
  