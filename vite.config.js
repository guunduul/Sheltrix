import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    // Rollup options untuk handle package yang tidak support browser
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
    }
  },
  optimizeDeps: {
    // Exclude SDK yang hanya support Node.js
    exclude: ['@shelby-protocol/sdk'],
    include: ['@aptos-labs/wallet-adapter-core']
  },
  resolve: {
    conditions: ['browser', 'module', 'import', 'default']
  },
  define: {
    // Polyfill global untuk beberapa package Node.js
    global: 'globalThis',
    'process.env': {}
  }
})
