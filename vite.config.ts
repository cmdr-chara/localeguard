import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/localeguard/' : '/',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
}))
