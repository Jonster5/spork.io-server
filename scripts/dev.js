import { context } from 'esbuild';
import { spawn } from 'child_process';

const ctx = await context({
	entryPoints: ['src/main.ts'],
	outfile: '.dev/main.js',
	bundle: true,
	sourcemap: true,
	platform: 'node',
	tsconfig: './tsconfig.json',
	format: 'esm',
	external: ['ws'],
});

await ctx.watch();

spawn(
	'node',
	['--enable-source-maps', '--no-warnings', '--watch', '.dev/main.js'],
	{ stdio: 'inherit' }
);
