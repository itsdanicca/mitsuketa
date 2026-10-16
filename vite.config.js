import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 runs as a Vite plugin — no postcss.config.js or
// tailwind.config.js needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})