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
>>>>>>> 7a5cda402fc9c7f54b00e0ee45b0d0f9c64dbff9
