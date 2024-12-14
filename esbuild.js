/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');

const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV === 'development',
  mainFields: ['module', 'main'],
  external: ['coc.nvim'],
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'lib/index.js',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  console.log('watching...');
  esbuild.context(buildOptions).then((ctx) => {
    ctx
      .watch()
      .then(() => {
        console.log('watch build succeeded');
      })
      .catch((err) => {
        console.error('watch build failed:', err);
      });
  });
} else {
  esbuild.build(buildOptions).catch(console.error);
}
