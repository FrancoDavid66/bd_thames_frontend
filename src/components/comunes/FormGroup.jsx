// components/FormGroup.jsx
const FormGroup = ({ label, children }) => (
    <div className="mb-4">
      <label className="block mb-1 text-[12px] text-suave dark:text-suave-dark">
        {label}
      </label>
      {children}
    </div>
  )
  
  export default FormGroup
  