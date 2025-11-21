// src/components/comunes/PanelToggle.jsx
import { useState } from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'

const PanelToggle = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-lg dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white font-semibold text-left"
      >
        <span>{title}</span>
        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
      </button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  )
}

export default PanelToggle
