import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/zhang/' : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      // Source extraction/transcoding tools can hold Windows files open.
      // Their scratch data never needs to trigger a page reload.
      ignored: ['**/tmp/**', '**/qa/**', '**/exports/**', '**/dist/**'],
    },
  },
})
