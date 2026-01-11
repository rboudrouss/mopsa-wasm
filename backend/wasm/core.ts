import { EventEmitter } from "events";
import { ExecCore, ExecCoreOptions } from "wasi-kernel";
import type { Environ } from "wasi-kernel/lib/kernel/exec";

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

  async run(
    bytecodeFile: string,
    args: string[],
    callbackNames: string[] = []
  ) {
    const bin = this.opts.binDir || ".";

    // Preload standard OCaml shared libraries
    for (const p of this.preloads()) {
      await this.proc.dyld.preload(p.name, p.uri, p.reloc);
    }

    // Start the OCaml bytecode interpreter
    await this.start(
      `${bin}/ocamlrun.wasm`,
      ["ocamlrun", bytecodeFile, ...args],
      this.env
    );

    this.api = this.wasm.instance.exports as unknown as OCamlCAPI;
    this.callbacks = this._getCallbacks(callbackNames);
  }

  preloads(): Array<{ name: string; uri: string; reloc?: any }> {
    const bin = this.opts.binDir || ".";
    // OCaml standard library stubs
    const stdlibs = ["dllcamlstr", "dllunix", "dllthreads", "dllzarith"];
    // MOPSA-specific stubs
    const mopsaStubs = ["dllmopsa_utils_stubs", "dllmopsa_c_parser_stubs"];
    // GMP, MPFR, and Apron libraries (TODO)
    const nativeLibs = [
      "dllgmp", // GMP base library (required by MPFR and Apron)
      "dllmpfr", // MPFR (required by Apron)
      "dllapron", // APRON core
      "dllgmp_caml", // mlgmpidl, gmp bindings to ocaml
      "dllapron_caml", // Apron core OCaml bindings
      "dllboxMPQ_caml", // Apron Box domain (intervals)
      "dlloctMPQ_caml", // Apron Octagon domain
      "dllpolkaMPQ_caml", // Apron Polyhedra domain
    ];

    return [...stdlibs, ...mopsaStubs, ...nativeLibs].map((b) => ({
      name: `${b}.so`,
      uri: `${bin}/${b}.wasm`,
      reloc: STDLIB_STUBS[b],
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

const STDLIB_STUBS: { [lib: string]: any } = {
  dllunix: {
    js: Object.fromEntries(UNIX_STUBBED.map((nm) => [nm, () => 0])),
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
