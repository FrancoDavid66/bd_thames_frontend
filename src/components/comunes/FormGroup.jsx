// components/FormGroup.jsx
const FormGroup = ({ label, children }) => (
    <div className="mb-4">
      <label className="block mb-1 font-medium text-brand-100 dark:text-brand-200">
        {label}
      </label>
      {children}
    </div>
  )
  
  export default FormGroup
  