<<<<<<< HEAD

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins:[react(), tailwindcss()], server:{ port:5173 } })
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173
  }
})
>>>>>>> d2eb161 (Proyecto StudentsNotes: frontend y backend iniciales)
