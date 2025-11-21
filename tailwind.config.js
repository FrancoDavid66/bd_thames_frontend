export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#B80000',  // rojo intenso
          dark: '#000000',     // fondo dark
          light: '#E5E5E5',    // gris claro
          white: '#FFFFFF',    // blanco
        },
      },
    },
  },
  plugins: [],
}
