import { build } from 'esbuild';

await build({
  entryPoints: ['pdfium-text-layer.js'],
  bundle: true,
  outfile: 'pdfium-text-layer.bundle.js',
  format: 'iife',
  globalName: 'PdfiumTextLayer',
  platform: 'browser',
  target: ['chrome110'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

console.log('Build complete: pdfium-text-layer.bundle.js');
