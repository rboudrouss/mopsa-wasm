import * as esbuild from 'esbuild';

// Parse command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const minify = args.includes('--minify');

// Helper function for build/watch mode
async function buildOrWatch(options) {
    if (watchMode) {
        const ctx = await esbuild.context(options);
        console.log('Watching for changes...');
        await ctx.watch();
    } else {
        await esbuild.build(options);
    }
}

// Common build options
const commonOptions = {
    bundle: true,
    platform: 'browser',
    format: 'esm',
    sourcemap: 'inline',
    minify,
    logLevel: 'info',
};

// Build the WASM worker
console.log('Building MOPSA WASM worker...');

await buildOrWatch({
    ...commonOptions,
    entryPoints: ['./backend/wasm/mopsa_worker.ts'],
    outdir: 'dist',

    // Inject shims for Node.js APIs used by dependencies
    inject: [
        './backend/wasm/shims/process-shim.js',
        './backend/wasm/shims/buffer-shim.js'
    ],

    // Define global as self for browser workers
    define: {
        global: 'self'
    }
});

console.log('Build complete!');

if (watchMode) {
    console.log('Watching for changes... Press Ctrl+C to stop.');
}

