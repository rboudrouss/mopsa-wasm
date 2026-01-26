/**
 * Test script to run clang-ast.wasm via Node.js and see the JSON output
 *
 * Usage: node test_clang_wasm.mjs "int a = 1/0;"
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { WASI } from 'wasi';
import { argv } from 'process';
import { tmpdir } from 'os';
import { join } from 'path';

const code = argv[2] || 'int a = 1/0;';
console.log('Input code:', code);

// Path to clang-ast.wasm
const wasmPath = '../../libs/llvm/bin/clang-ast.wasm';

async function runClang(code) {
    // Create temp directory and write code to file
    const tempDir = mkdtempSync(join(tmpdir(), 'clang-test-'));
    const inputFile = join(tempDir, 'input.c');
    writeFileSync(inputFile, code);

    console.log('Temp file:', inputFile);

    // Read the wasm file
    const wasmBuffer = readFileSync(wasmPath);

    // Create WASI instance with preopened directory
    // Map the temp directory to the same path inside WASM
    const wasi = new WASI({
        version: 'preview1',
        args: ['clang', '-cc1', '-ast-dump=json', '/input.c'],
        preopens: {
            '/': tempDir,
        },
    });

    // Compile the wasm module
    const wasmModule = await WebAssembly.compile(wasmBuffer);

    // Create instance with WASI imports
    const instance = await WebAssembly.instantiate(wasmModule, {
        wasi_snapshot_preview1: wasi.wasiImport,
    });

    try {
        const exitCode = wasi.start(instance);
        console.log('Exit code:', exitCode);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        // Cleanup
        rmSync(tempDir, { recursive: true });
    }
}

runClang(code).catch(console.error);

