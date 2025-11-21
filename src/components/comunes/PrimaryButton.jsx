const PrimaryButton = ({ children, onClick, type = 'button' }) => {
    return (
      <button
        type={type}
        onClick={onClick}
        className="bg-brand-primary hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white px-5 py-2 rounded-lg font-semibold shadow transition"
      >
        {children}
      </button>
    )
  }
  
  export default PrimaryButton
  