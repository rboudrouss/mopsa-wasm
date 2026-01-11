/**
 * Patch for wasi-kernel's DynamicLoader to support inter-library symbol resolution.
 * 
 * The default dyld only resolves symbols from:
 * 1. JavaScript relocations (reloc.js)
 * 2. Main WASM instance exports (ocamlrun.wasm)
 * 3. Standard imports (proc.import)
 * 
 * This patch adds a global symbol table that accumulates exports from all loaded
 * dynamic libraries, allowing libraries like dllpolkaMPQ_caml to find symbols
 * exported by dllmpfr.
 */

import type { ExecCore } from "wasi-kernel";

/**
 * Global symbol table shared across all dynamic libraries.
 * Maps symbol names to their implementations (functions or values).
 */
export class GlobalSymbolTable {
  private symbols: Map<string, Function> = new Map();

  /**
   * Add all function exports from a WASM instance to the global symbol table.
   */
  addExportsFrom(instance: WebAssembly.Instance, libraryName: string): void {
    for (const [name, exp] of Object.entries(instance.exports)) {
      if (exp instanceof Function) {
        // Don't override existing symbols (first definition wins)
        if (!this.symbols.has(name)) {
          this.symbols.set(name, exp);
          // console.log(`[GlobalSymbolTable] Added ${name} from ${libraryName}`);
        }
      }
    }
  }

  /**
   * Look up a symbol by name.
   */
  get(name: string): Function | undefined {
    return this.symbols.get(name);
  }

  /**
   * Check if a symbol exists.
   */
  has(name: string): boolean {
    return this.symbols.has(name);
  }

  /**
   * Get all symbol names.
   */
  keys(): IterableIterator<string> {
    return this.symbols.keys();
  }
}

/**
 * Patches the DynamicLoader.Def class to use a global symbol table
 * when resolving symbols for dynamic libraries.
 * 
 * @param dyld The DynamicLoader instance to patch
 * @param globalSymbols The global symbol table to use
 */
export function patchDyldWithGlobalSymbols(
  core: ExecCore,
  globalSymbols: GlobalSymbolTable
): void {
  const dyld = core.proc.dyld;
  const originalDlopen = dyld.dlopen.bind(dyld);

  // Override dlopen to capture exports after instantiation
  dyld.dlopen = function(path: number, flags: number): number {
    const handle = originalDlopen(path, flags);
    
    if (handle !== 0 && dyld.dylibTable) {
      const ref = dyld.dylibTable.ref.get(handle);
      if (ref && ref.instance) {
        // Get the library name for logging
        const pathStr = core.proc.userGetCString(path).toString('utf-8');
        globalSymbols.addExportsFrom(ref.instance, pathStr);
      }
    }
    
    return handle;
  };

  // Patch the Def class prototype to use global symbols
  // We need to access the internal DynamicLibrary.Def class
  if (dyld.dylibTable) {
    // Already have a table, patch existing entries
    patchExistingDefs(dyld.dylibTable, globalSymbols);
  }
}

/**
 * Patch existing library definitions to use global symbols.
 */
function patchExistingDefs(
  table: { def: Map<string, unknown> },
  globalSymbols: GlobalSymbolTable
): void {
  for (const [path, def] of table.def.entries()) {
    const defObj = def as { reloc?: { js?: Record<string, unknown> } };
    if (!defObj.reloc) {
      defObj.reloc = {};
    }
    if (!defObj.reloc.js) {
      defObj.reloc.js = {};
    }
    
    // Create a proxy that checks global symbols
    const originalJs = defObj.reloc.js;
    defObj.reloc.js = new Proxy(originalJs, {
      get(target, prop: string) {
        // First check explicit JS relocations
        if (prop in target) {
          return target[prop];
        }
        // Then check global symbol table
        const sym = globalSymbols.get(prop);
        if (sym) {
          return sym;
        }
        return undefined;
      },
      has(target, prop: string) {
        return prop in target || globalSymbols.has(prop);
      }
    });
  }
}

export { GlobalSymbolTable as default };

