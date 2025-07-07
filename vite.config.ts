// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodePolyfills from 'vite-plugin-node-polyfills'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: {
    global: 'globalThis',
    'process.env': {}, // ensures process is defined
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['crypto', 'stream', 'assert', 'buffer'],
  },
})

