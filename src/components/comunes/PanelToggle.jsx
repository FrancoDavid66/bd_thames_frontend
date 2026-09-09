// src/components/comunes/PanelToggle.jsx
import { useState } from 'react'
import { HiChevronDown, HiChevronRight } from 'react-icons/hi'

const PanelToggle = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-linea dark:border-linea-dark rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-4 py-2 bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark font-medium text-left"
      >
        <span>{title}</span>
        {isOpen ? <HiChevronDown /> : <HiChevronRight />}
      </button>
      {isOpen && <div className="p-4 bg-card dark:bg-card-dark">{children}</div>}
    </div>
  )
}

export default PanelToggle
