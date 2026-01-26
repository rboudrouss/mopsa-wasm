/**
 * ClangParser - Uses wasi-kernel to run clang-ast.wasm for C AST parsing
 */

import { ExecCore, ExecCoreOptions } from 'wasi-kernel';

export interface ParseResult {
    status: 'success' | 'error';
    ast?: string;
    stderr?: string;
    exitCode?: number;
    message?: string;
}

/**
 * Clang executable wrapper using wasi-kernel
 *
 * We use stdin to pass source code to clang since file-based input
 * has issues with WASI's file handling returning EINVAL.
 */
class ClangExecutable extends ExecCore {
    private stdoutData: string = '';
    private stderrData: string = '';
    private utf8 = new TextDecoder();
    private encoder = new TextEncoder();

    constructor(opts: ExecCoreOptions) {
        super(opts);
        console.log('[ClangExecutable] Constructor called');
    }

    /**
     * Write input code to stdin before starting the process
     */
    writeStdin(code: string): void {
        // Access the stdin stream from ExecCore
        const stdinStream = (this as any).stdin;
        if (!stdinStream) {
            throw new Error('stdin stream not available - make sure stdin: true is passed to constructor');
        }

        // Convert code to Uint8Array and write to stdin
        const codeBytes = this.encoder.encode(code);
        console.log('[ClangExecutable] Writing', codeBytes.length, 'bytes to stdin');
        stdinStream.write(codeBytes);

        // SimplexStream has a bug: it uses a single 'pos' for both read and write.
        // After writing N bytes, pos = N and after end(), length = N.
        // Then when read() is called, pos >= length is true, so it returns 0 (EOF).
        // We need to reset pos to 0 so reading can start from the beginning.
        const bytesWritten = stdinStream.pos;
        stdinStream.end();  // Signal end of input (sets length = pos)
        stdinStream.pos = 0;  // Reset read position to beginning
        console.log('[ClangExecutable] stdin write complete, bytes:', bytesWritten, 'length:', stdinStream.length);
    }

    private setupOutputCapture(): void {
        console.log('[ClangExecutable] Setting up output capture');

        // Capture stdout and stderr
        // wasi-kernel emits 'stream:out' with {fd: 1, data} for stdout and {fd: 2, data} for stderr
        this.on('stream:out', (ev: { fd: number; data: Uint8Array }) => {
            const text = this.utf8.decode(ev.data);
            console.log(`[ClangExecutable] stream:out fd=${ev.fd} len=${ev.data.length}`);
            if (ev.fd === 1) {
                this.stdoutData += text;
            } else if (ev.fd === 2) {
                this.stderrData += text;
            }
        });
    }

    async runClang(wasmPath: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        this.stdoutData = '';
        this.stderrData = '';

        // Set up output capture before starting
        this.setupOutputCapture();

        try {
            console.log('[ClangExecutable] Calling start()...');
            await this.start(wasmPath, args, {});
            console.log('[ClangExecutable] start() completed normally');
        } catch (e: any) {
            console.log('[ClangExecutable] start() threw:', e);
            // wasi-kernel throws on proc_exit with non-zero code
            const exitCode = e.code ?? e.exitCode ?? 1;
            return { stdout: this.stdoutData, stderr: this.stderrData, exitCode };
        }

        // Debug: Check what files exist in the virtual filesystem
        console.log('[ClangExecutable] Checking virtual filesystem...');
        try {
            const rootFiles = this.fs.readdirSync('/') as string[];
            console.log('[ClangExecutable] / contents:', rootFiles);

            if (rootFiles.includes('dev')) {
                const devFiles = this.fs.readdirSync('/dev');
                console.log('[ClangExecutable] /dev contents:', devFiles);

                // Check stdout/stderr files
                try {
                    const stdoutContent = this.fs.readFileSync('/dev/stdout', 'utf8') as string;
                    console.log('[ClangExecutable] /dev/stdout length:', stdoutContent.length);
                    if (stdoutContent.length > 0) {
                        this.stdoutData = stdoutContent;
                    }
                } catch (e) {
                    console.log('[ClangExecutable] /dev/stdout read error:', e);
                }

                try {
                    const stderrContent = this.fs.readFileSync('/dev/stderr', 'utf8') as string;
                    console.log('[ClangExecutable] /dev/stderr length:', stderrContent.length);
                    if (stderrContent.length > 0) {
                        this.stderrData = stderrContent;
                    }
                } catch (e) {
                    console.log('[ClangExecutable] /dev/stderr read error:', e);
                }
            }

            if (rootFiles.includes('src')) {
                const srcFiles = this.fs.readdirSync('/src');
                console.log('[ClangExecutable] /src contents:', srcFiles);
            }
        } catch (e) {
            console.log('[ClangExecutable] FS inspection error:', e);
        }

        return { stdout: this.stdoutData, stderr: this.stderrData, exitCode: 0 };
    }

    getStdout(): string { return this.stdoutData; }
    getStderr(): string { return this.stderrData; }
}

/**
 * ClangParser singleton for parsing C code to AST
 */
export class ClangParser {
    private static wasmPath: string = 'clang-ast.wasm';
    private static initialized: boolean = false;

    /**
     * Initialize the parser (validates wasm file exists)
     */
    static async init(wasmPath?: string): Promise<void> {
        if (this.initialized) return;

        if (wasmPath) {
            this.wasmPath = wasmPath;
        }

        // Verify the wasm file exists by doing a HEAD request
        console.log('[ClangParser] Checking clang-ast.wasm...');
        const response = await fetch(this.wasmPath, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`clang-ast.wasm not found at ${this.wasmPath}: ${response.statusText}`);
        }

        this.initialized = true;
        console.log('[ClangParser] Initialized successfully!');
    }

    /**
     * Parse C code and return the AST
     */
    static async parseC(code: string): Promise<ParseResult> {
        if (!this.initialized) {
            return { status: 'error', message: 'ClangParser not initialized. Call init() first.' };
        }

        console.log('[ClangParser] Parsing C code...');
        console.log('[ClangParser] Input:', code.substring(0, 100));

        // Create a new ClangExecutable instance for each parse
        // Use stdin to pass source code to avoid WASI file system issues
        const clang = new ClangExecutable({
            stdin: true,   // Enable stdin so we can write code to it
            tty: false,
            debug: true,   // Enable debug for now to see what's happening
        });

        // Write the source code to stdin before starting clang
        clang.writeStdin(code);

        // Run clang with AST dump arguments
        // Use -cc1 mode directly (driver mode can't fork/exec in WASM)
        // Use '-' as filename to read from stdin
        const args = ['clang', '-cc1', '-ast-dump=json', '-x', 'c', '-'];
        console.log('[ClangParser] Args:', args);
        console.log('[ClangParser] Running:', args.join(' '));

        const result = await clang.runClang(this.wasmPath, args);

        console.log('[ClangParser] Exit code:', result.exitCode);
        console.log('[ClangParser] stdout length:', result.stdout.length);
        console.log('[ClangParser] stderr length:', result.stderr.length);

        if (result.exitCode !== 0) {
            return {
                status: 'error',
                message: result.stderr || 'Clang failed with no error message',
                stderr: result.stderr,
                exitCode: result.exitCode,
            };
        }

        if (!result.stdout) {
            return {
                status: 'error',
                message: 'No AST output from clang',
                stderr: result.stderr,
                exitCode: result.exitCode,
            };
        }

        return {
            status: 'success',
            ast: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        };
    }
}

// Export for browser global access
if (typeof window !== 'undefined') {
    (window as any).ClangParser = ClangParser;
}

export default ClangParser;

