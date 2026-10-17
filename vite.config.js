import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // nombres ESTABLES sin hash: el index.html siempre apunta a archivos
        // que EXISTEN en el deploy actual. Antes, cada deploy cambiaba el hash
        // y un index cacheado pedía archivos viejos que ya no existen (404 →
        // pantalla negra). Ahora el archivo se actualiza en el mismo nombre.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    open: true,
  },
})
