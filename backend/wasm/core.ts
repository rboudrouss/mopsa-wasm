import { EventEmitter } from "events";
import { ExecCore, ExecCoreOptions } from "wasi-kernel";
import type { Environ } from "wasi-kernel/lib/kernel/exec";

// Type aliases for OCaml values
type i32 = number;

// Helper to encode a number as LEB128
function encodeLEB128(value: number): number[] {
  const result: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    result.push(byte);
  } while (value !== 0);
  return result;
}

// Helper to decode LEB128 from a byte array at a given position
function decodeLEB128(bytes: Uint8Array, startPos: number): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  let byte;
  let pos = startPos;
  do {
    byte = bytes[pos++];
    value |= (byte & 0x7f) << shift;
    shift += 7;
    bytesRead++;
  } while (byte & 0x80);
  return { value, bytesRead };
}

/**
 * Patches a WASM binary to set initial and maximum memory.
 * The memory section format is: section_id(1) section_size(varuint) count(varuint)
 *   then for each memory: flags(varuint) initial(varuint) [max(varuint)]
 *
 * Flags: bit 0 = has maximum, bit 1 = shared
 * When we increase initial memory significantly, we must also set a maximum.
 */
function patchWasmMemory(wasmBytes: Uint8Array, initialPages: number, maxPages: number = 65536): Uint8Array {
  const MEMORY_SECTION_ID = 5;

  let offset = 8; // Skip magic number (4) + version (4)

  while (offset < wasmBytes.length) {
    const sectionId = wasmBytes[offset];
    const sectionSizeInfo = decodeLEB128(wasmBytes, offset + 1);
    const sectionContentStart = offset + 1 + sectionSizeInfo.bytesRead;
    const sectionEnd = sectionContentStart + sectionSizeInfo.value;

    if (sectionId === MEMORY_SECTION_ID) {
      // Found memory section - parse it
      let pos = sectionContentStart;

      const countInfo = decodeLEB128(wasmBytes, pos);
      pos += countInfo.bytesRead;
      const count = countInfo.value;

      if (count >= 1) {
        const flagsInfo = decodeLEB128(wasmBytes, pos);
        pos += flagsInfo.bytesRead;
        const originalFlags = flagsInfo.value;

        const initialInfo = decodeLEB128(wasmBytes, pos);
        pos += initialInfo.bytesRead;
        const currentInitial = initialInfo.value;

        let currentMax = 0;
        if (originalFlags & 1) {
          const maxInfo = decodeLEB128(wasmBytes, pos);
          pos += maxInfo.bytesRead;
          currentMax = maxInfo.value;
        }

        console.log(`[patchWasmMemory] Current: initial=${currentInitial}, max=${currentMax || 'none'}, flags=${originalFlags}`);
        console.log(`[patchWasmMemory] Patching to: initial=${initialPages}, max=${maxPages}`);

        // Build new memory section content
        // We always set the "has maximum" flag (bit 0) to avoid validation errors
        const newFlags = originalFlags | 1; // Set "has maximum" bit

        const newContent: number[] = [];
        newContent.push(...encodeLEB128(count));
        newContent.push(...encodeLEB128(newFlags));
        newContent.push(...encodeLEB128(initialPages));
        newContent.push(...encodeLEB128(maxPages));

        // Build new section
        const newSectionSize = encodeLEB128(newContent.length);

        // Assemble new WASM binary
        const before = wasmBytes.slice(0, offset);
        const after = wasmBytes.slice(sectionEnd);

        const result = new Uint8Array(
          before.length + 1 + newSectionSize.length + newContent.length + after.length
        );

        let writePos = 0;
        result.set(before, writePos);
        writePos += before.length;

        result[writePos++] = MEMORY_SECTION_ID;

        for (const b of newSectionSize) result[writePos++] = b;
        for (const b of newContent) result[writePos++] = b;

        result.set(after, writePos);

        console.log(`[patchWasmMemory] WASM size: ${wasmBytes.length} -> ${result.length}`);
        return result;
      }
      break;
    }

    offset = sectionEnd;
  }

  console.warn('[patchWasmMemory] Memory section not found, returning original');
  return wasmBytes;
}

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
  export function Val_int(v: number): i32 {
    return (v << 1) | 1;
  }
  export function Val_bool(b: boolean): i32 {
    return Val_int(+b);
  }
  export function Int_val(v: i32) {
    return v >> 1;
  }
  export function Bool_val(v: i32) {
    return !!Int_val(v);
  }
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
      OCAMLFIND_CONF: "/lib/findlib.conf",
    };
  }

  /**
   * Override fetchCompile to patch the WASM memory for the main OCaml runtime.
   * The pre-compiled ocamlrun.wasm has very small initial memory (3 pages = 192KB)
   * which causes "index out of bounds" errors during OCaml custom block allocation.
   */
  async fetchCompile(uri: string): Promise<WebAssembly.Module> {
    console.log(`[OCamlExecutable.fetchCompile] Called with uri: ${uri}`);

    // Check if this is the main ocamlrun.wasm that needs memory patching
    const needsMemoryPatch = uri.includes('ocamlrun.wasm');
    const initialPages = this.opts.initialMemory || 256; // Default: 256 pages = 16MB
    const maxPages = this.opts.maximumMemory || 65536; // Default: 65536 pages = 4GB

    // Use caching if available
    const cacheKey = needsMemoryPatch ? `${uri}:mem=${initialPages}-${maxPages}` : uri;
    const cached = this.cached?.get(cacheKey);
    if (cached) {
      console.log(`[OCamlExecutable.fetchCompile] Returning cached for ${cacheKey}`);
      return cached;
    }

    const promise = (async () => {
      let bytes = await this.fetch(uri);
      console.log(`[OCamlExecutable.fetchCompile] Fetched ${uri}, size: ${bytes.length}`);

      if (needsMemoryPatch) {
        console.log(`[OCamlExecutable] Patching ${uri} memory: initial=${initialPages} pages (${initialPages * 64}KB), max=${maxPages} pages`);
        bytes = patchWasmMemory(bytes, initialPages, maxPages);
        console.log(`[OCamlExecutable] After patch, size: ${bytes.length}`);
      }

      const module = await WebAssembly.compile(bytes);

      // Verify the compiled module's memory by doing a minimal instantiation
      if (needsMemoryPatch) {
        const imports = WebAssembly.Module.imports(module);
        const exports = WebAssembly.Module.exports(module);
        console.log(`[OCamlExecutable] Compiled module memory imports:`, imports.filter(i => i.kind === 'memory'));
        console.log(`[OCamlExecutable] Compiled module memory exports:`, exports.filter(e => e.kind === 'memory'));

        // Try to instantiate minimally to check memory
        try {
          // Create minimal imports to satisfy the module
          const minimalImports: WebAssembly.Imports = {};
          for (const imp of imports) {
            if (!minimalImports[imp.module]) {
              minimalImports[imp.module] = {};
            }
            if (imp.kind === 'function') {
              (minimalImports[imp.module] as Record<string, unknown>)[imp.name] = () => 0;
            } else if (imp.kind === 'table') {
              (minimalImports[imp.module] as Record<string, unknown>)[imp.name] = new WebAssembly.Table({ initial: 500, element: 'anyfunc' });
            } else if (imp.kind === 'global') {
              (minimalImports[imp.module] as Record<string, unknown>)[imp.name] = new WebAssembly.Global({ value: 'i32', mutable: true }, 0);
            }
          }
          const testInstance = await WebAssembly.instantiate(module, minimalImports);
          const testMemory = testInstance.exports.memory as WebAssembly.Memory;
          if (testMemory) {
            const pages = testMemory.buffer.byteLength / 65536;
            console.log(`[OCamlExecutable] ✓ Verified memory: ${testMemory.buffer.byteLength} bytes = ${pages} pages`);
          }
        } catch (e) {
          console.log(`[OCamlExecutable] Could not verify memory (this is expected):`, (e as Error).message);
        }
      }

      return module;
    })();

    if (this.cached) {
      this.cached.set(cacheKey, promise);
    }

    return promise;
  }

  async run(
    bytecodeFile: string,
    args: string[],
    callbackNames: string[] = []
  ) {
    const bin = this.opts.binDir || ".";

    // Preload standard OCaml shared libraries
    console.log('[OCamlExecutable] Preloading dynamic libraries...');
    for (const p of this.preloads()) {
      const relocKeys = p.reloc?.js ? Object.keys(p.reloc.js) : [];
      console.log(`[OCamlExecutable] Preloading: ${p.name} from ${p.uri}, relocs: ${relocKeys.length} functions`);
      if (relocKeys.length > 0) {
        console.log(`[OCamlExecutable]   Reloc functions: ${relocKeys.slice(0, 10).join(', ')}${relocKeys.length > 10 ? '...' : ''}`);
      }
      try {
        await this.proc.dyld.preload(p.name, p.uri, p.reloc);
        console.log(`[OCamlExecutable] ✓ Preloaded: ${p.name}`);
      } catch (e) {
        console.error(`[OCamlExecutable] ✗ Failed to preload ${p.name}:`, e);
        throw e;
      }
    }

    // Start the OCaml bytecode interpreter
    console.log('[OCamlExecutable] Starting ocamlrun.wasm...');
    try {
      await this.start(
        `${bin}/ocamlrun.wasm`,
        ["ocamlrun", bytecodeFile, ...args],
        this.env
      );
      console.log('[OCamlExecutable] ✓ ocamlrun.wasm started successfully');
    } catch (e) {
      console.error('[OCamlExecutable] ✗ Failed to start ocamlrun.wasm:', e);
      throw e;
    }

    // Log actual memory size after instantiation
    const memory = this.wasm.instance.exports.memory as WebAssembly.Memory;
    if (memory) {
      const pages = memory.buffer.byteLength / 65536;
      console.log(`[OCamlExecutable] After start, memory buffer size: ${memory.buffer.byteLength} bytes (${pages} pages)`);
    }

    this.api = this.wasm.instance.exports as unknown as OCamlCAPI;
    this.callbacks = this._getCallbacks(callbackNames);
  }

  preloads(): Array<{ name: string; uri: string; reloc?: any }> {
    const bin = this.opts.binDir || ".";
    // OCaml standard library stubs
    const stdlibs = ["dllcamlstr", "dllunix", "dllthreads", "dllzarith"];
    // MOPSA-specific stubs
    const mopsaStubs = ["dllmopsa_utils_stubs", "dllmopsa_c_parser_stubs"];

    // Build preloads for standard libraries
    const preloadList = [...stdlibs, ...mopsaStubs].map((b) => ({
      name: `${b}.so`,
      uri: `${bin}/${b}.wasm`,
      reloc: STDLIB_STUBS[b],
    }));

    // Use the merged Apron library which contains:
    // - GMP (base math library)
    // - MPFR (multi-precision floats)
    // - Apron core + all domains (Box, Octagon, Polka)
    // - All OCaml bindings (mlgmpidl, mlapronidl, domain bindings)
    // This avoids inter-library symbol resolution issues in wasi-kernel
    //
    // The OCaml bytecode references these library names, so we register
    // the merged library under all the names the bytecode expects:
    const apronLibNames = [
      "dllgmp_caml",
      "dllapron_caml",
      "dllboxMPQ_caml",
      "dlloctMPQ_caml",
      "dllpolkaMPQ_caml",
    ];
    const mergedUri = `${bin}/dllapron_merged.wasm`;
    for (const name of apronLibNames) {
      preloadList.push({
        name: `${name}.so`,
        uri: mergedUri,
        reloc: STDLIB_STUBS[name],
      });
    }

    return preloadList;
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

    const x = this.api.malloc(Math.max(...names.map((s) => s.length)) + 1);
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
const UNIX_STUBBED = [
  "fstat",
  "fsync",
  "strchr",
  "fcntl",
  "ftruncate",
  "getgrnam",
  "gmtime",
  "localtime",
  "mktime",
  "lockf",
  "pwrite",
  "sysconf",
  "mmap",
  "munmap",
  "putenv",
  "rewinddir",
  "select",
  "nanosleep",
  "tcgetattr",
  "tcsetattr",
  "time",
  "truncate",
  "issetugid",
  "cfgetospeed",
  "cfgetispeed",
];

// Math/floating-point stubs needed by dllmopsa_utils_stubs
const MATH_STUBS = {
  // Floating point rounding control (no-op in WASM, uses default rounding)
  fesetround: () => 0,
  fegetround: () => 0,
  // Long double (128-bit) functions - WASM doesn't support long double,
  // so we stub these to return 0 (or approximate with double)
  __extenddftf2: () => 0, // double to long double
  __extendsftf2: () => 0, // float to long double
  __fpclassifyl: () => 1, // long double classify - return FP_NORMAL
  // Math functions
  fmodf: (x: number, y: number) => x % y,
  llrint: (x: number) => Math.round(x),
  lrint: (x: number) => Math.round(x),
};

// C runtime stubs needed by Apron/GMP
// These functions need access to WASM memory, so they will be bound at runtime
const C_RUNTIME_STUBS = {
  __assert_fail: (
    _assertion: number,
    _file: number,
    _line: number,
    _func: number
  ) => {
    console.error("Assertion failed in WASM module");
    throw new Error("Assertion failed");
  },
  iprintf: () => 0, // Integer printf (no-op)
  fiprintf: () => 0, // File integer printf (no-op)
  putchar: (c: number) => {
    console.log(String.fromCharCode(c));
    return c;
  },
  // Printf family - no-op, return number of "written" chars (1) to indicate success
  printf: () => 1,
  sprintf: () => 1,
  fprintf: () => 1,
  vsprintf: () => 1,
  vsnprintf: () => 1,
  snprintf: () => 1,
  __small_fprintf: () => 1,
  // Character classification functions
  isdigit: (c: number) => (c >= 48 && c <= 57 ? 1 : 0), // '0'-'9'
  islower: (c: number) => (c >= 97 && c <= 122 ? 1 : 0), // 'a'-'z'
  isascii: (c: number) => (c >= 0 && c <= 127 ? 1 : 0),
  isxdigit: (c: number) =>
    (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)
      ? 1
      : 0,
  // Errno
  __errno_location: () => 0, // Return a valid pointer (will read as errno=0)
  // String functions - these return 0/NULL (callers should handle)
  strchr: () => 0,
  strcat: () => 0,
  // File I/O stubs
  fread: () => 0,
  feof: () => 1, // Return true (end of file)
  ferror: () => 0,
  putc: () => 0,
  getc: () => -1, // EOF
  ungetc: () => -1, // EOF
  // Locale
  nl_langinfo: () => 0,
  localeconv: () => 0,
  // Math functions for long double (return 0 or use double approximation)
  __fpclassifyl: () => 1, // FP_NORMAL
  ldexpl: () => 0,
  floorl: () => 0,
  sqrtl: () => 0,
  nextafterl: () => 0,
  nextafterf: (x: number, y: number) => (x < y ? x + 1e-7 : x - 1e-7),
  fmaxl: () => 0,
  fminl: () => 0,
  truncl: () => 0,
  ceill: () => 0,
  // Floating-point environment
  __fe_getround: () => 0, // FE_TONEAREST
  __fe_raise_inexact: () => 0,
  // Search
  bsearch: () => 0, // Return NULL (not found)
};

const STDLIB_STUBS: { [lib: string]: any } = {
  dllunix: {
    js: Object.fromEntries(UNIX_STUBBED.map((nm) => [nm, () => 0])),
  },
  dllmopsa_utils_stubs: {
    js: MATH_STUBS,
  },
  // All Apron-related libraries use the merged module, but may need stubs
  dllgmp_caml: {
    js: C_RUNTIME_STUBS,
  },
  dllapron_caml: {
    js: C_RUNTIME_STUBS,
  },
  dllboxMPQ_caml: {
    js: C_RUNTIME_STUBS,
  },
  dlloctMPQ_caml: {
    js: C_RUNTIME_STUBS,
  },
  dllpolkaMPQ_caml: {
    js: C_RUNTIME_STUBS,
  },
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
    this.binDir = options.binDir || ".";
    this.nmDir = options.nmDir || "./node_modules";

    const execOptions: MopsaPodOptions = {
      stdin: false,
      tty: false,
      binDir: this.binDir,
      debug: options.debug || false,
      ...options,
    };

    this.core = new OCamlExecutable(execOptions);

    // Forward stdout to event
    const utf8 = new TextDecoder();
    this.core.on("stream:out", (ev: { data: Uint8Array }) => {
      this.emit("stdout", utf8.decode(ev.data));
    });
  }

  get fs() {
    return this.core.fs;
  }

  async boot(): Promise<void> {
    this.emit("status", "Loading MOPSA bytecode...");

    try {
      await this.upload(`${this.binDir}/mopsa_worker.bc`, "/lib/mopsa.bc");

      this.putFile("/lib/findlib.conf", 'path="/lib/ocaml"');

      await this._preloadStubs();

      this.emit("status", "Starting OCaml runtime...");

      try {
        await this.core.run("/lib/mopsa.bc", [], ["mopsa_post"]);
      } catch (runError: any) {
        console.error("Error during core.run():", runError);
        console.error("Stack trace:", runError.stack);
        throw new Error(`OCaml runtime failed: ${runError.message}`);
      }

      this.emit("status", "MOPSA ready");
      this.emit("ready");
    } catch (error: any) {
      console.error("Boot error:", error);
      this.emit("error", error);
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
    if (!filename.startsWith("/")) filename = `/lib/${filename}`;
    const dir = filename.replace(/\/[^/]+$/, "");
    try {
      this.fs.mkdirSync(dir, { recursive: true });
    } catch {
      /* ignore if exists */
    }
    this.fs.writeFileSync(filename, content);
  }

  command(cmd: any[]): string | null {
    const mopsa_post = this.core.callbacks?.mopsa_post;
    if (!mopsa_post) {
      console.warn("mopsa_post callback not registered");
      return null;
    }

    const json = JSON.stringify(cmd);
    const answer = mopsa_post(this.core.to_caml_string(json));
    return this.core.from_caml_string(answer);
  }

  init(config: string = ""): string | null {
    return this.command(["Init", config]);
  }

  analyze(code: string): string | null {
    return this.command(["Analyze", code]);
  }

  setConfig(config: string): string | null {
    return this.command(["SetConfig", config]);
  }

  setCode(code: string): string | null {
    return this.command(["SetCode", code]);
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
    // Preload mopsa_c_parser_stubs with JavaScript functions
    try {
      await this.core.proc.dyld.preload(
        "dllmopsa_c_parser_stubs.so",
        `${this.binDir}/dllmopsa_c_parser_stubs.wasm`,
        {
          js: {
            js_mopsa_emit: (s: i32) => this._handleEmit(s),
            js_interrupt_pending: (_: i32) => this._interrupt_pending(),
          },
        }
      );
    } catch (e) {
      console.warn("Could not preload dllmopsa_c_parser_stubs.wasm:", e);
    }
  }

  private _handleEmit(ptr: i32): void {
    const str = this.core.from_caml_string(ptr);
    try {
      const msg = JSON.parse(str);
      this.emit("message", msg);
    } catch {
      this.emit("message", str);
    }
  }
}

export { OCamlExecutable, OCamlCAPI };
