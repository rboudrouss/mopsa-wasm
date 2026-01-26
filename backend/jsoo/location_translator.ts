/**
 * Location Translator
 * 
 * Converts Clang JSON source locations to OCaml loc, eloc, and range types.
 * 
 * OCaml Types (from Clang_AST.ml):
 * 
 * type loc = {
 *   loc_line: int;
 *   loc_column: int;
 *   loc_file: string;
 * }
 * 
 * type eloc = {
 *   eloc_loc: loc;
 *   eloc_stack: loc list;
 * }
 * 
 * type range = {
 *   range_begin: eloc;
 *   range_end: eloc;
 * }
 */

import type { SourceLocation, SourceRange } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_int,
    Val_emptylist,
    Val_list,
    caml_alloc_tuple,
    caml_copy_string,
    Store_field,
} from './ocaml_values';

// ============================================================================
// Types
// ============================================================================

export interface LocationContext {
    /** Default file name when not specified in location */
    defaultFile: string;
    /** Default line when not specified */
    defaultLine: number;
    /** Default column when not specified */
    defaultColumn: number;
}

// ============================================================================
// Location Translator Class
// ============================================================================

export class LocationTranslator {
    /** Cache for file strings to ensure sharing (OCaml strings) */
    private fileCache = new Map<string, OcamlValue>();

    /** Invalid file marker (OCaml string) */
    private invalidFile: OcamlValue;

    /** Current context (file, line, col from parent nodes) */
    private context: LocationContext = {
        defaultFile: '<invalid>',
        defaultLine: -1,
        defaultColumn: -1,
    };

    constructor() {
        this.invalidFile = caml_copy_string('<invalid>');
    }

    /**
     * Update the location context from a node's location.
     * JSON locations may omit fields that are the same as the previous location.
     */
    updateContext(loc: SourceLocation | undefined): void {
        if (!loc) return;

        if (loc.file !== undefined) {
            this.context.defaultFile = loc.file;
        }
        if (loc.line !== undefined) {
            this.context.defaultLine = loc.line;
        }
        if (loc.col !== undefined) {
            this.context.defaultColumn = loc.col;
        }
    }

    /**
     * Get or create a cached file string (as OCaml value).
     */
    private getFileString(filename: string): OcamlValue {
        let cached = this.fileCache.get(filename);
        if (cached === undefined) {
            cached = caml_copy_string(filename);
            this.fileCache.set(filename, cached);
        }
        return cached;
    }
    
    /**
     * Translate a JSON SourceLocation to OCaml loc record.
     * 
     * OCaml type: { loc_line: int; loc_column: int; loc_file: string }
     * 
     * Note: Clang counts columns from 1, but MOPSA counts columns from 0.
     */
    translateLoc(loc: SourceLocation | undefined): OcamlBlock {
        const block = caml_alloc_tuple(3);
        
        if (!loc) {
            // Invalid location
            Store_field(block, 0, Val_int(-1));  // loc_line
            Store_field(block, 1, Val_int(-1));  // loc_column
            Store_field(block, 2, this.invalidFile);  // loc_file
            return block;
        }
        
        // Handle expansion locations (macros) - use the expansion location
        const effectiveLoc = loc.expansionLoc ?? loc;
        
        // Get values, using context defaults if not specified
        const line = effectiveLoc.line ?? this.context.defaultLine;
        const col = effectiveLoc.col ?? this.context.defaultColumn;
        const file = effectiveLoc.file ?? this.context.defaultFile;
        
        // Update context for subsequent locations
        this.updateContext(effectiveLoc);
        
        if (line === -1 || file === '<invalid>') {
            Store_field(block, 0, Val_int(-1));
            Store_field(block, 1, Val_int(-1));
            Store_field(block, 2, this.invalidFile);
        } else {
            // Note: Clang columns are 1-based, MOPSA expects 0-based columns
            Store_field(block, 0, Val_int(line));
            Store_field(block, 1, Val_int(col - 1));  // Convert to 0-based
            Store_field(block, 2, this.getFileString(file));
        }
        
        return block;
    }
    
    /**
     * Build the macro expansion stack for an eloc.
     * Returns an OCaml list of loc records.
     */
    private buildMacroStack(loc: SourceLocation): OcamlValue {
        const stack: OcamlBlock[] = [];

        // Walk up the macro expansion chain
        let current: SourceLocation | undefined = loc;
        while (current) {
            if (current.spellingLoc && current.expansionLoc) {
                // This is a macro expansion
                // The spelling location is where the token was spelled
                stack.push(this.translateLoc(current.spellingLoc));
            }
            // Move to the expansion location for the next iteration
            current = current.expansionLoc;
        }

        // Convert to OCaml list (in reverse order to match C++ implementation)
        return Val_list(stack.reverse(), (loc) => loc);
    }

    /**
     * Translate a JSON SourceLocation to OCaml eloc record.
     *
     * OCaml type: { eloc_loc: loc; eloc_stack: loc list }
     */
    translateEloc(loc: SourceLocation | undefined): OcamlBlock {
        const block = caml_alloc_tuple(2);

        // eloc_loc: the final location
        Store_field(block, 0, this.translateLoc(loc));

        // eloc_stack: macro expansion stack
        if (loc) {
            Store_field(block, 1, this.buildMacroStack(loc));
        } else {
            Store_field(block, 1, Val_emptylist);
        }

        return block;
    }

    /**
     * Translate a JSON SourceRange to OCaml range record.
     *
     * OCaml type: { range_begin: eloc; range_end: eloc }
     */
    translateRange(range: SourceRange | undefined): OcamlBlock {
        const block = caml_alloc_tuple(2);

        if (range) {
            Store_field(block, 0, this.translateEloc(range.begin));
            Store_field(block, 1, this.translateEloc(range.end));
        } else {
            Store_field(block, 0, this.translateEloc(undefined));
            Store_field(block, 1, this.translateEloc(undefined));
        }

        return block;
    }

    /**
     * Get all unique files encountered during translation.
     * Returns an OCaml list of strings.
     */
    getFiles(): OcamlValue {
        const files = Array.from(this.fileCache.keys());
        return Val_list(files, caml_copy_string);
    }

    /**
     * Reset the location context (call when starting a new file).
     */
    resetContext(file?: string): void {
        this.context = {
            defaultFile: file ?? '<invalid>',
            defaultLine: -1,
            defaultColumn: -1,
        };
    }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a default invalid location.
 */
export function makeInvalidLoc(): OcamlBlock {
    const block = caml_alloc_tuple(3);
    Store_field(block, 0, Val_int(-1));
    Store_field(block, 1, Val_int(-1));
    Store_field(block, 2, caml_copy_string('<invalid>'));
    return block;
}

/**
 * Create a default invalid eloc.
 */
export function makeInvalidEloc(): OcamlBlock {
    const block = caml_alloc_tuple(2);
    Store_field(block, 0, makeInvalidLoc());
    Store_field(block, 1, Val_emptylist);
    return block;
}

/**
 * Create a default invalid range.
 */
export function makeInvalidRange(): OcamlBlock {
    const block = caml_alloc_tuple(2);
    Store_field(block, 0, makeInvalidEloc());
    Store_field(block, 1, makeInvalidEloc());
    return block;
}

