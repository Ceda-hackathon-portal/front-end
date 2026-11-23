import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Read on the dev server only. No backend configuration is added to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.CEDA_DEV_API_TARGET || env.VITE_API_URL || 'http://localhost:3001'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: target.replace(/\/api\/v1\/?$/, ''), changeOrigin: false },
      },
    },
  }
})
