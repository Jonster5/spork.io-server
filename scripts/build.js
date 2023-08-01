import { build } from 'esbuild';

await build({
	entryPoints: ['src/main.ts'],
	outfile: 'dist/main.js',
	platform: 'node',
	target: ['node18'],
	charset: 'utf8',
	bundle: true,
	minify: true,
	treeShaking: true,
	format: 'esm',
	external: ['ws'],
	tsconfig: './tsconfig.json',
});
