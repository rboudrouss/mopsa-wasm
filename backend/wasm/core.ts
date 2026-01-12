import { EventEmitter } from 'events';
import { ExecCore, ExecCoreOptions } from 'wasi-kernel';
import type { Environ } from 'wasi-kernel/lib/kernel/exec';

// Type aliases for OCaml values
type i32 = number;

/**
 * OCaml C API interface - functions exported by the OCaml runtime
 */
interface OCamlCAPI {
    malloc(sz: i32): i32;
    free(p: i32): void;
    caml_alloc_string(len: i32): i32;
    caml_named_value(name: i32): i32;
    caml_callback(closure: i32, arg: i32): i32;
}

namespace OCamlCAPI {
    export function Val_int(v: number): i32 { return (v << 1) | 1; }
    export function Val_bool(b: boolean): i32 { return Val_int(+b); }
    export function Int_val(v: i32) { return v >> 1; }
    export function Bool_val(v: i32) { return !!Int_val(v); }
    export const Val_unit = Val_int(0);
    export const Val_false = Val_int(0);
    export const Val_true = Val_int(1);
}

export interface MopsaPodOptions extends ExecCoreOptions {
    binDir?: string;
    nmDir?: string;
    initialMemory?: number;  // Initial memory in pages (64KB each)
    maximumMemory?: number;  // Maximum memory in pages
}

/**
 * Extends ExecCore with OCaml functionality
 */
class OCamlExecutable extends ExecCore {
    declare opts: MopsaPodOptions;
    api!: OCamlCAPI;
    callbacks: { [name: string]: (arg: i32) => i32 } = {};

    constructor(opts: MopsaPodOptions) {
        super(opts);
    }

    initialEnv(): Environ {
        return {
            ...super.initialEnv(),
            'OCAMLFIND_CONF': '/lib/findlib.conf'
        };
    }

    async run(bytecodeFile: string, args: string[], callbackNames: string[] = []) {
        const bin = this.opts.binDir || '.';

        // Preload standard OCaml shared libraries
        for (const p of this.preloads()) {
            await this.proc.dyld.preload(p.name, p.uri, p.reloc);
        }

        // Start the OCaml bytecode interpreter
        await this.start(`${bin}/ocamlrun.wasm`,
            ['ocamlrun', bytecodeFile, ...args], this.env);

        this.api = this.wasm.instance.exports as unknown as OCamlCAPI;
        this.callbacks = this._getCallbacks(callbackNames);
    }

    preloads(): Array<{ name: string; uri: string; reloc?: any }> {
        const bin = this.opts.binDir || '.';
        // Only load basic OCaml standard library stubs before runtime starts
        // Following jsCoq's approach: load only dllcamlstr, dllunix, dllthreads
        const stdlibs = ['dllcamlstr', 'dllunix', 'dllthreads'];

        return stdlibs.map(b => ({
            name: `${b}.so`,
            uri: `${bin}/${b}.wasm`,
            reloc: STDLIB_STUBS[b]
        }));
    }

    to_caml_string(s: string): i32 {
        const bytes = new TextEncoder().encode(s);
        const a = this.api.caml_alloc_string(bytes.length);
        this.proc.membuf.set(bytes, a);
        return a;
    }

    from_caml_string(ptr: i32): string {
        return this.proc.userGetCString(ptr) as unknown as string;
    }

    _getCallbacks(names: string[]): { [name: string]: (arg: i32) => i32 } {
        const callbacks: { [name: string]: (arg: i32) => i32 } = {};
        if (names.length === 0) return callbacks;

        const x = this.api.malloc(Math.max(...names.map(s => s.length)) + 1);
        for (const name of names) {
            this.proc.membuf.write(name + "\0", x);
            const closure_f = this.api.caml_named_value(x);
            if (closure_f) {
                callbacks[name] = (arg: i32) =>
                    this.api.caml_callback(this.proc.mem.getUint32(closure_f, true), arg);
            }
        }
        this.api.free(x);
        return callbacks;
    }
}

/**
 * Stubs for Unix functions not available in WASI
 */
const UNIX_STUBBED = ['fstat', 'fsync', 'strchr', 'fcntl', 'ftruncate',
    'getgrnam', 'gmtime', 'localtime', 'mktime', 'lockf', 'pwrite',
    'sysconf', 'mmap', 'munmap', 'putenv', 'rewinddir', 'select',
    'nanosleep', 'tcgetattr', 'tcsetattr', 'time', 'truncate',
    'issetugid', 'cfgetospeed', 'cfgetispeed'];

/**
 * Stubs for C library functions not available in WASM
 * These are needed by GMP, MPFR, and Apron libraries
 */
const C_LIBRARY_STUBS = {
    // I/O functions - return error codes
    'printf': () => 0,
    'sprintf': () => 0,
    'iprintf': () => 0,
    'vsprintf': () => 0,
    '__small_fprintf': () => 0,
    'putchar': () => 0,
    'putc': () => 0,
    'getc': () => -1,  // EOF
    'ungetc': () => -1,
    'fread': () => 0,
    'ferror': () => 0,
    'feof': () => 0,

    // String functions
    'strchr': () => 0,
    'strcat': () => 0,

    // Character classification
    'isascii': () => 0,
    'isdigit': () => 0,
    'islower': () => 0,
    'isxdigit': () => 0,

    // Locale functions
    'nl_langinfo': () => 0,
    'localeconv': () => 0,

    // Search/sort
    'bsearch': () => 0,

    // Error handling
    '__assert_fail': () => { throw new Error('Assertion failed'); },
    '__errno_location': () => 0,

    // Math functions - return 0 or NaN
    'nextafterf': () => 0,
    'nextafterl': () => 0,
    'ldexpl': () => 0,
    'floorl': () => 0,
    'ceill': () => 0,
    'truncl': () => 0,
    'sqrtl': () => 0,
    'fmaxl': () => 0,
    'fminl': () => 0,
    'fmodf': () => 0,
    'llrint': () => 0,
    'lrint': () => 0,

    // 128-bit float operations (not supported in WASM32)
    '__fpclassifyl': () => 0,
    '__extenddftf2': () => 0,
    '__extendsftf2': () => 0,
    '__trunctfdf2': () => 0,
    '__addtf3': () => 0,
    '__subtf3': () => 0,
    '__multf3': () => 0,
    '__divtf3': () => 0,
    '__netf2': () => 0,
    '__eqtf2': () => 0,
    '__gttf2': () => 0,
    '__getf2': () => 0,
    '__lttf2': () => 0,
    '__letf2': () => 0,
    '__fixtfsi': () => 0,
    '__fixunstfsi': () => 0,
    '__floatsitf': () => 0,
    '__floatunsitf': () => 0,

    // FPU control
    'fesetround': () => 0,
};

const STDLIB_STUBS: { [lib: string]: any } = {
    'dllunix': {
        js: Object.fromEntries(UNIX_STUBBED.map(nm => [nm, () => 0]))
    }
};

/**
 * Main WASM execution manager for MOPSA
 */
export class MopsaPod extends EventEmitter {
    core: OCamlExecutable;
    binDir: string;
    nmDir: string;
    private interruptPending: boolean = false;

    constructor(options: MopsaPodOptions = {}) {
        super();
        this.binDir = options.binDir || '.';
        this.nmDir = options.nmDir || './node_modules';

        const execOptions: MopsaPodOptions = {
            stdin: false,
            tty: false,
            binDir: this.binDir,
            debug: options.debug || false,
            ...options
        };

        this.core = new OCamlExecutable(execOptions);

        // Forward stdout to event
        const utf8 = new TextDecoder();
        this.core.on('stream:out', (ev: { data: Uint8Array }) => {
            this.emit('stdout', utf8.decode(ev.data));
        });
    }

    get fs() { return this.core.fs; }

    async boot(): Promise<void> {
        this.emit('status', 'Loading MOPSA bytecode...');

        try {
            await this.upload(`${this.binDir}/mopsa_worker.bc`, '/lib/mopsa.bc');

            this.putFile('/lib/findlib.conf', 'path="/lib/ocaml"');

            this.emit('status', 'Loading additional libraries...');

            // Load additional libraries BEFORE starting the runtime (like jsCoQ)
            await this._preloadStubs();

            this.emit('status', 'Starting OCaml runtime...');

            // Start the OCaml runtime (which will also preload basic stdlib modules)
            try {
                await this.core.run('/lib/mopsa.bc', [], ['mopsa_post']);
            } catch (runError: any) {
                console.error('Error during core.run():', runError);
                console.error('Stack trace:', runError.stack);
                throw new Error(`OCaml runtime failed: ${runError.message}`);
            }

            this.emit('status', 'MOPSA ready');
            this.emit('ready');

        } catch (error: any) {
            console.error('Boot error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async upload(fromUri: string, toPath: string): Promise<void> {
        const response = await fetch(fromUri);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${fromUri}: ${response.statusText}`);
        }
        const content = new Uint8Array(await response.arrayBuffer());
        this.putFile(toPath, content);
    }

    putFile(filename: string, content: Uint8Array | string): void {
        if (!filename.startsWith('/')) filename = `/lib/${filename}`;
        const dir = filename.replace(/\/[^/]+$/, '');
        try {
            this.fs.mkdirSync(dir, { recursive: true });
        } catch { /* ignore if exists */ }
        this.fs.writeFileSync(filename, content);
    }

    command(cmd: any[]): string | null {
        const mopsa_post = this.core.callbacks?.mopsa_post;
        if (!mopsa_post) {
            console.warn('mopsa_post callback not registered');
            return null;
        }

        const json = JSON.stringify(cmd);
        const answer = mopsa_post(this.core.to_caml_string(json));
        return this.core.from_caml_string(answer);
    }

    init(config: string = ''): string | null {
        return this.command(['Init', config]);
    }

    analyze(code: string): string | null {
        return this.command(['Analyze', code]);
    }

    setConfig(config: string): string | null {
        return this.command(['SetConfig', config]);
    }

    setCode(code: string): string | null {
        return this.command(['SetCode', code]);
    }

    interrupt(): void {
        this.interruptPending = true;
    }

    clearInterrupt(): void {
        this.interruptPending = false;
    }

    private _interrupt_pending(): i32 {
        return OCamlCAPI.Val_bool(this.interruptPending);
    }

    private async _preloadStubs(): Promise<void> {
        // Load essential libraries + stub GMP/MPFR/Apron for minimal MOPSA

        const bin = this.binDir;

        console.log('Loading zarith...');
        // Load zarith (required by many OCaml libraries)
        try {
            await this.core.proc.dyld.preload(
                'dllzarith.so',
                `${bin}/dllzarith.wasm`
            );
            console.log('zarith loaded');
        } catch (e) {
            console.error('Failed to load zarith:', e);
            throw e;
        }

        console.log('Loading stub GMP/MPFR/Apron libraries...');
        // Load stub implementations of GMP/MPFR/Apron
        // All these libraries are actually the same stub file
        // but we need to register them under different names
        const stubLibs = [
            'dllgmp_caml.so',
            'dllapron_caml.so',
            'dllboxMPQ_caml.so',
            'dlloctMPQ_caml.so',
            'dllpolkaMPQ_caml.so'
        ];

        for (const lib of stubLibs) {
            try {
                await this.core.proc.dyld.preload(
                    lib,
                    `${bin}/dllgmp_caml.wasm`  // All use the same stub file
                );
            } catch (e) {
                console.error(`Failed to load ${lib}:`, e);
                throw e;
            }
        }
        console.log('GMP/MPFR/Apron stubs loaded');

        console.log('Loading MOPSA utility stubs...');
        // Load MOPSA utility stubs with C library stubs
        try {
            await this.core.proc.dyld.preload(
                'dllmopsa_utils_stubs.so',
                `${bin}/dllmopsa_utils_stubs.wasm`,
                { js: C_LIBRARY_STUBS }
            );
            console.log('MOPSA utility stubs loaded');
        } catch (e) {
            console.error('Failed to load MOPSA utility stubs:', e);
            throw e;
        }

        console.log('Loading mopsa_c_parser_stubs...');
        // Load mopsa_c_parser_stubs with JavaScript functions
        try {
            await this.core.proc.dyld.preload(
                'dllmopsa_c_parser_stubs.so',
                `${bin}/dllmopsa_c_parser_stubs.wasm`,
                {
                    js: {
                        ...C_LIBRARY_STUBS,
                        js_mopsa_emit: (s: i32) => this._handleEmit(s),
                        js_interrupt_pending: (_: i32) => this._interrupt_pending(),
                    }
                }
            );
            console.log('mopsa_c_parser_stubs loaded');
        } catch (e) {
            console.error('Failed to load mopsa_c_parser_stubs:', e);
            throw e;
        }

        console.log('Loading Clang parser library...');
        // Load Clang parser library (Clang_to_ml.cc + libclang-cpp + libLLVM)
        try {
            await this.core.proc.dyld.preload(
                'dllclang_parser.so',
                `${bin}/dllclang_parser.wasm`,
                { js: C_LIBRARY_STUBS }
            );
            console.log('Clang parser library loaded');
        } catch (e) {
            console.error('Failed to load Clang parser library:', e);
            console.warn('C parsing with Clang will not be available');
            // Don't throw - allow MOPSA to run without Clang if needed
        }

        console.log('');
        console.log('NOTE: This is a minimal MOPSA build with stub numerical libraries');
        console.log('Full GMP/MPFR/Apron functionality is not available');
        console.log('');
    }

    private _handleEmit(ptr: i32): void {
        const str = this.core.from_caml_string(ptr);
        try {
            const msg = JSON.parse(str);
            this.emit('message', msg);
        } catch {
            this.emit('message', str);
        }
    }
}

export { OCamlExecutable, OCamlCAPI };
