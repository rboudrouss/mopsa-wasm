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
    format: 'iife',  // IIFE for direct browser use with <script> tag
    sourcemap: 'inline',
    minify,
    logLevel: 'info',
};

// Build the Clang WASM parser for browser
console.log('Building Clang WASM parser for mopsajs...');

await buildOrWatch({
    ...commonOptions,
    entryPoints: ['./backend/jsoo/clang_parser.ts'],
    outfile: '_build/default/backend/jsoo/clang_parser.js',
    globalName: 'ClangParserModule',

    // Inject shims for Node.js APIs used by wasi-kernel
    inject: [
        './backend/wasm/shims/process-shim.js',
        './backend/wasm/shims/buffer-shim.js'
    ],

    // Define global as window for browser
    define: {
        global: 'window'
    },

    // External dependencies that should not be bundled
    // (none - we want everything bundled for browser use)
});

// Build the Clang JSON to OCaml AST translator for browser
// This translates Clang's JSON AST into OCaml values for MOPSA
console.log('Building Clang JSON to OCaml AST translator...');

await buildOrWatch({
    ...commonOptions,
    entryPoints: ['./backend/jsoo/clang_parser_ml.ts'],
    outfile: '_build/default/backend/jsoo/clang_parser_ml.js',
    globalName: 'ClangParserMLModule',

    // No shims needed - this is pure JavaScript/TypeScript
    // Define global as window for browser
    define: {
        global: 'window'
    },
});

console.log('Build complete!');

if (watchMode) {
    console.log('Watching for changes... Press Ctrl+C to stop.');
}

