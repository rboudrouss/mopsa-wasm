/**
 * OCaml Value Construction Helpers for js_of_ocaml
 *
 * This file provides TypeScript wrappers for creating OCaml values from JavaScript.
 *
 * In js_of_ocaml, OCaml values are represented as:
 * - Integers: JavaScript numbers (immediate values, odd numbers = 2n+1)
 * - Blocks: JavaScript arrays where arr[0] is the tag
 *
 * OCaml block layout:
 *   [tag, field0, field1, ..., fieldN]
 *
 * Special values:
 * - Unit: 0 (Val_unit)
 * - Empty list: 0 (Val_emptylist, same as Val_unit)
 * - None: 0 (Val_none)
 * - true: 1 (Val_true)
 * - false: 0 (Val_false)
 * - Some(x): [0, x]
 * - List cons: [0, head, tail]
 * - Tuples/Records: [0, field0, field1, ...]
 * - Variant with args: [tag, arg0, arg1, ...]
 * - Constant variant: tag as integer
 *
 * Note: In OCaml, variant constructors are numbered in order of declaration.
 * Constant constructors (no arguments) and non-constant constructors
 * (with arguments) are numbered separately.
 */

// ============================================================================
// Basic OCaml Value Types
// ============================================================================

/** OCaml value type - either an immediate integer or a block (array) */
export type OcamlValue = number | OcamlBlock;

/** OCaml block - array with tag at index 0 */
export type OcamlBlock = [number, ...OcamlValue[]];

// ============================================================================
// Constants
// ============================================================================

/** Unit value () */
export const Val_unit = 0;

/** Empty list [] */
export const Val_emptylist = 0;

/** Boolean false */
export const Val_false = 0;

/** Boolean true */
export const Val_true = 1;

/** None option */
export const Val_none = 0;

// ============================================================================
// Integer Conversion
// ============================================================================

/** Convert JavaScript number to OCaml int (Val_int) */
export function Val_int(n: number): number {
    // In js_of_ocaml, integers are represented directly
    return n;
}

/** Convert OCaml int to JavaScript number (Int_val) */
export function Int_val(v: OcamlValue): number {
    if (typeof v !== 'number') {
        throw new TypeError('Int_val: expected number');
    }
    return v;
}

// ============================================================================
// Block Allocation
// ============================================================================

/** 
 * Allocate an OCaml block with given size and tag.
 * Fields are initialized to 0 (Val_unit).
 */
export function caml_alloc(size: number, tag: number): OcamlBlock {
    const block: OcamlBlock = [tag];
    for (let i = 0; i < size; i++) {
        block.push(0); // Initialize with Val_unit
    }
    return block;
}

/** Allocate a tuple (tag 0) */
export function caml_alloc_tuple(size: number): OcamlBlock {
    return caml_alloc(size, 0);
}

/** Store a value in a block field (0-indexed) */
export function Store_field(block: OcamlBlock, index: number, value: OcamlValue): void {
    block[index + 1] = value; // +1 because block[0] is the tag
}

/** Read a value from a block field (0-indexed) */
export function Field(block: OcamlBlock, index: number): OcamlValue {
    return block[index + 1]; // +1 because block[0] is the tag
}

/** Get the tag of a block */
export function Tag_val(block: OcamlBlock): number {
    return block[0];
}

/** Get the size of a block (number of fields) */
export function Wosize_val(block: OcamlBlock): number {
    return block.length - 1; // -1 because block[0] is the tag
}

// ============================================================================
// String Allocation
// ============================================================================

/**
 * Create an OCaml string from JavaScript string.
 * In js_of_ocaml, strings are represented using MlBytes or the runtime's string functions.
 * We use the js_of_ocaml runtime's caml_string_of_jsstring if available.
 */
export function caml_copy_string(s: string): OcamlValue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;

    // Try jsoo_runtime first (js_of_ocaml exports functions here)
    if (g.jsoo_runtime?.caml_string_of_jsstring) {
        return g.jsoo_runtime.caml_string_of_jsstring(s);
    }

    // Fallback to direct global
    if (g.caml_string_of_jsstring) {
        return g.caml_string_of_jsstring(s);
    }

    // Last resort: return as-is (may not work correctly)
    console.warn('[caml_copy_string] jsoo_runtime not found, returning JS string directly');
    return s as unknown as OcamlValue;
}

// ============================================================================
// Boolean Conversion
// ============================================================================

/** Convert JavaScript boolean to OCaml bool */
export function Val_bool(b: boolean): number {
    return b ? Val_true : Val_false;
}

/** Convert OCaml bool to JavaScript boolean */
export function Bool_val(v: OcamlValue): boolean {
    return v !== Val_false;
}

// ============================================================================
// Option Type
// ============================================================================

/** Create Some(value) */
export function Val_some(value: OcamlValue): OcamlBlock {
    return [0, value];
}

/** Create None or Some(value) based on condition */
export function Val_option<T>(
    value: T | undefined | null,
    convert: (v: T) => OcamlValue
): OcamlValue {
    if (value === undefined || value === null) {
        return Val_none;
    }
    return Val_some(convert(value));
}

// ============================================================================
// List Type
// ============================================================================

/** Create OCaml list from JavaScript array */
export function Val_list<T>(
    items: T[],
    convert: (item: T) => OcamlValue
): OcamlValue {
    let result: OcamlValue = Val_emptylist;
    // Build list in reverse (cons prepends)
    for (let i = items.length - 1; i >= 0; i--) {
        result = [0, convert(items[i]), result];
    }
    return result;
}

/** Create OCaml list from JavaScript array with index */
export function Val_list_indexed<T>(
    items: T[],
    convert: (item: T, index: number) => OcamlValue
): OcamlValue {
    let result: OcamlValue = Val_emptylist;
    // Build list in reverse (cons prepends)
    for (let i = items.length - 1; i >= 0; i--) {
        result = [0, convert(items[i], i), result];
    }
    return result;
}

/** Create OCaml list from iterator */
export function Val_list_from_iter<T>(
    iter: Iterable<T>,
    convert: (item: T) => OcamlValue
): OcamlValue {
    return Val_list(Array.from(iter), convert);
}

// ============================================================================
// Array Type
// ============================================================================

/**
 * Create OCaml array from JavaScript array.
 * OCaml arrays are blocks with tag 0.
 */
export function Val_array<T>(
    items: T[],
    convert: (item: T) => OcamlValue
): OcamlBlock {
    if (items.length === 0) {
        // Empty array is special: Atom(0)
        return [0];
    }
    const block: OcamlBlock = [0];
    for (const item of items) {
        block.push(convert(item));
    }
    return block;
}

// ============================================================================
// Tuple Helpers
// ============================================================================

/** Create a 2-tuple (pair) */
export function Val_tuple2(a: OcamlValue, b: OcamlValue): OcamlBlock {
    return [0, a, b];
}

/** Create a 3-tuple */
export function Val_tuple3(a: OcamlValue, b: OcamlValue, c: OcamlValue): OcamlBlock {
    return [0, a, b, c];
}

/** Create a 4-tuple */
export function Val_tuple4(a: OcamlValue, b: OcamlValue, c: OcamlValue, d: OcamlValue): OcamlBlock {
    return [0, a, b, c, d];
}

/** Create a 5-tuple */
export function Val_tuple5(
    a: OcamlValue, b: OcamlValue, c: OcamlValue, d: OcamlValue, e: OcamlValue
): OcamlBlock {
    return [0, a, b, c, d, e];
}

// ============================================================================
// Variant Helpers
// ============================================================================

/**
 * Create a constant variant (variant with no arguments).
 * Just returns the tag as an integer.
 */
export function Val_constant_variant(tag: number): number {
    return tag;
}

/**
 * Create a variant with a single argument.
 * Returns [tag, arg].
 */
export function Val_variant1(tag: number, arg: OcamlValue): OcamlBlock {
    return [tag, arg];
}

/**
 * Create a variant with multiple arguments (inline record or tuple).
 * Returns [tag, arg1, arg2, ...].
 */
export function Val_variant(tag: number, ...args: OcamlValue[]): OcamlBlock {
    return [tag, ...args];
}

// ============================================================================
// Z.t (Zarith big integers)
// ============================================================================

/**
 * Create a Z.t value from a JavaScript bigint or number.
 * In js_of_ocaml with zarith, small integers fit in one word,
 * while larger ones use a different representation.
 *
 * For simplicity, we'll use string representation which zarith can parse.
 */
export function Val_Z(n: bigint | number | string): OcamlValue {
    // For js_of_ocaml with zarith, the representation depends on the library
    // We'll use a string that can be converted later
    const str = String(n);
    // This is a placeholder - actual implementation needs to match zarith's JS representation
    return caml_copy_string(str);
}

// ============================================================================
// Int64
// ============================================================================

/**
 * Create an OCaml Int64.t from JavaScript bigint or number.
 * In js_of_ocaml, Int64 is typically represented as a special block.
 */
export function Val_int64(n: bigint | number): OcamlValue {
    // js_of_ocaml represents Int64 specially
    // For now, we use the numeric value directly if it fits
    if (typeof n === 'bigint') {
        return Number(n);
    }
    return n;
}

// ============================================================================
// Record Construction Helper
// ============================================================================

/**
 * Helper class for building OCaml records incrementally.
 * Records in OCaml are blocks with tag 0.
 */
export class RecordBuilder {
    private block: OcamlBlock;

    constructor(numFields: number) {
        this.block = caml_alloc_tuple(numFields);
    }

    set(index: number, value: OcamlValue): this {
        Store_field(this.block, index, value);
        return this;
    }

    build(): OcamlBlock {
        return this.block;
    }
}

// ============================================================================
// Cache for handling cyclic structures
// ============================================================================

/**
 * Cache for storing already-translated nodes.
 * Handles cyclic structures and maintains sharing.
 */
export class TranslationCache<K> {
    private map = new Map<K, OcamlValue>();

    has(key: K): boolean {
        return this.map.has(key);
    }

    get(key: K): OcamlValue | undefined {
        return this.map.get(key);
    }

    set(key: K, value: OcamlValue): void {
        this.map.set(key, value);
    }

    /**
     * Get cached value or create and cache a new one.
     * The creator function receives a pre-allocated block that is
     * cached BEFORE the body runs, allowing cyclic references.
     */
    getOrCreate(
        key: K,
        numFields: number,
        tag: number,
        fill: (block: OcamlBlock) => void
    ): OcamlValue {
        const cached = this.map.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const block = caml_alloc(numFields, tag);
        this.map.set(key, block); // Cache before filling to handle cycles
        fill(block);
        return block;
    }
}

