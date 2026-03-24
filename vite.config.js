import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          // 🔥 REMOVE shelby-sdk chunk - tidak perlu lagi
          if (id.includes('@aptos-labs/wallet-adapter-core')) {
            return 'wallet-core';
          }
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
    }
  },
  optimizeDeps: {
    include: ['@aptos-labs/wallet-adapter-core']
  },
  resolve: {
    conditions: ['browser', 'module', 'import', 'default']
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  }
})