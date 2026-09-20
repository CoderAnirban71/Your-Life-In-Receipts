import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // three.js only ships with the lazy 3D scenes; D3 and the React vendor graph stay cacheable
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\/](three|@react-three)[\/]/ },
            { name: 'd3', test: /node_modules[\/]d3/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
})
