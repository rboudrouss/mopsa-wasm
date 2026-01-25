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
 * We need to write the input file to the VFS BEFORE WASI is initialized,
 * because WASI sets up file descriptors during init() and files written
 * after that may not be accessible.
 */
class ClangExecutable extends ExecCore {
    private stdoutData: string = '';
    private stderrData: string = '';
    private utf8 = new TextDecoder();
    private inputCode: string = '';

    constructor(opts: ExecCoreOptions, inputCode: string) {
        super(opts);
        this.inputCode = inputCode;
        console.log('[ClangExecutable] Constructor called');
    }

    /**
     * Override populateRootFs to add our input file
     * This is called by ExecCore constructor BEFORE init() creates the WASI instance
     */
    populateRootFs(): void {
        // Call parent to create /home and /bin
        super.populateRootFs();

        // Write the input file - this happens BEFORE WASI is initialized
        const inputPath = '/home/input.c';
        this.wasmFs.fs.writeFileSync(inputPath, this.inputCode, { mode: 0o644 });
        console.log('[ClangExecutable] Wrote input file during populateRootFs:', inputPath);
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
        // Pass the input code so it can be written during populateRootFs()
        // BEFORE WASI is initialized - this is crucial for file access to work
        const inputPath = '/home/input.c';
        const clang = new ClangExecutable({
            stdin: false,  // We don't need stdin - we'll use a file in the VFS
            tty: false,
            debug: true,  // Enable debug for now to see what's happening
        }, code);

        // Verify the file was written correctly
        try {
            const wasmFs = (clang as any).wasmFs;
            const stats = wasmFs.fs.statSync(inputPath);
            console.log('[ClangParser] File stats:', {
                size: stats.size,
                mode: stats.mode?.toString(8),
                isFile: stats.isFile()
            });
            const homeContents = wasmFs.fs.readdirSync('/home');
            console.log('[ClangParser] /home contents:', homeContents);
        } catch (e) {
            console.log('[ClangParser] File verification failed:', e);
        }

        // Run clang with AST dump arguments
        // Use -cc1 mode directly (driver mode can't fork/exec in WASM)
        const args = ['clang', '-cc1', '-ast-dump', '-x', 'c', inputPath];
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

