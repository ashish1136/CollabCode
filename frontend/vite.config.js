import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env.IS_PREACT': JSON.stringify('true')
  },
  resolve: {
    alias: {
      'monaco-editor/esm/vs/editor/editor.api.js': path.resolve(__dirname, './src/monaco-mock.js')
    }
  }
})
