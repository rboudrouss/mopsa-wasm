/**
 * MOPSA js_of_ocaml Runtime
 *
 * This file provides JavaScript runtime support for the MOPSA js_of_ocaml worker.
 * It is linked into the generated JavaScript file by dune.
 */

// Virtual filesystem for file operations
// js_of_ocaml provides a basic filesystem, but we may need to extend it

//Provides: shareDataHandler
//Requires: caml_jsstring_of_string, caml_string_of_jsstring
/**
 * shareDataHandler - Read file content from the share directory JSON data
 *
 * This function is called from OCaml via Sys_js.mount to provide file content
 * for the /share virtual filesystem. The share data is loaded from share.json
 * and stored in globalThis.shareData before MOPSA is initialized.
 *
 * @param path - OCaml string representing the path (relative to /share)
 * @returns OCaml string containing the file content
 */
function shareDataHandler(path) {
    var jsPath = caml_jsstring_of_string(path);

    // Remove leading slash if present
    if (jsPath.startsWith('/')) {
        jsPath = jsPath.substring(1);
    }

    // Get the share data from global scope
    if (typeof globalThis.shareData === 'undefined') {
        throw new Error('shareData not loaded. Load share.json before initializing MOPSA.');
    }

    // Navigate the JSON structure to find the file
    var pathParts = jsPath.split('/').filter(function(p) { return p.length > 0; });
    var data = globalThis.shareData;

    for (var i = 0; i < pathParts.length; i++) {
        if (data === undefined || data === null) {
            throw new Error('Path not found in share data: ' + jsPath);
        }
        data = data[pathParts[i]];
    }

    if (typeof data !== 'string') {
        throw new Error('Path does not point to a file: ' + jsPath);
    }

    return caml_string_of_jsstring(data);
}

//Provides: mopsa_emit
//Requires: caml_jsstring_of_string
function mopsa_emit(s) {
    var str = caml_jsstring_of_string(s);
    if (typeof postMessage !== 'undefined') {
        // Web Worker context
        postMessage(str);
    } else if (typeof process !== 'undefined' && process.stdout) {
        // Node.js context
        process.stdout.write(str + '\n');
    } else {
        // Browser console fallback
        console.log(str);
    }
}

//Provides: caml_sys_getcwd
function caml_sys_getcwd() {
    return "/";
}

//Provides: caml_sys_chdir
function caml_sys_chdir(dir) {
    // No-op in browser environment
    return 0;
}


//Provides: caml_unix_tcgetattr
function caml_unix_tcgetattr() { return 0; }

//Provides: unix_tcgetattr
function unix_tcgetattr() { return 0; }

//Provides: caml_unix_tcsetattr
function caml_unix_tcsetattr() { return 0; }

//Provides: unix_tcsetattr
function unix_tcsetattr() { return 0; }

//Provides: camlidl_apron_init
function camlidl_apron_init() { return 0; }

//Provides: camlidl_apron_set_var_operations
function camlidl_apron_set_var_operations() { return 0; }

//Provides: camlidl_oct_oct_manager_alloc
function camlidl_oct_oct_manager_alloc() { return 0; }

//Provides: camlidl_environment_ap_environment_make
function camlidl_environment_ap_environment_make() { return 0; }

//Provides: camlidl_abstract1_ap_abstract1_top
function camlidl_abstract1_ap_abstract1_top() { return 0; }

//Provides: camlidl_abstract1_ap_abstract1_bottom
function camlidl_abstract1_ap_abstract1_bottom() { return 0; }

//Provides: camlidl_polka_pk_manager_alloc_loose
function camlidl_polka_pk_manager_alloc_loose() { return 0; }

//Provides: camlidl_polka_pk_manager_alloc_equalities
function camlidl_polka_pk_manager_alloc_equalities() { return 0; }

//Provides: mlclang_get_target_info
//Requires: caml_int64_of_int32
/**
 * Returns target_info record for the given target_options.
 *
 * Based on Clang_to_ml.cc TargetInfoToML function.
 * Allocates 44 fields matching the OCaml target_info type.
 *
 * type target_info = {
 *   target_options: target_options;           // 0
 *   target_size_type: target_int_type;        // 1
 *   target_intmax_type: target_int_type;      // 2
 *   target_ptrdiff_type: target_int_type;     // 3
 *   target_intptr_type: target_int_type;      // 4
 *   target_wchar_type: target_int_type;       // 5
 *   target_wint_type: target_int_type;        // 6
 *   target_char16_type: target_int_type;      // 7
 *   target_char32_type: target_int_type;      // 8
 *   target_int64_type: target_int_type;       // 9
 *   target_sigatomic_type: target_int_type;   // 10
 *   target_processid_type: target_int_type;   // 11
 *   target_pointer_width: int;                // 12
 *   target_pointer_align: int;                // 13
 *   target_bool_width: int;                   // 14
 *   target_bool_align: int;                   // 15
 *   target_char_width: int;                   // 16
 *   target_char_align: int;                   // 17
 *   target_short_width: int;                  // 18
 *   target_short_align: int;                  // 19
 *   target_int_width: int;                    // 20
 *   target_int_align: int;                    // 21
 *   target_long_width: int;                   // 22
 *   target_long_align: int;                   // 23
 *   target_long_long_width: int;              // 24
 *   target_long_long_align: int;              // 25
 *   target_half_width: int;                   // 26
 *   target_half_align: int;                   // 27
 *   target_float_width: int;                  // 28
 *   target_float_align: int;                  // 29
 *   target_double_width: int;                 // 30
 *   target_double_align: int;                 // 31
 *   target_long_double_width: int;            // 32
 *   target_long_double_align: int;            // 33
 *   target_float128_width: int;               // 34
 *   target_float128_align: int;               // 35
 *   target_large_array_min_width: int;        // 36
 *   target_large_array_align: int;            // 37
 *   target_suitable_align: int;               // 38
 *   target_big_endian: bool;                  // 39
 *   target_TLS_supported: bool;               // 40
 *   target_has_int128: bool;                  // 41
 *   target_has_float128_type: bool;           // 42
 *   target_null_pointer_value: Int64.t;       // 43
 * }
 *
 * target_int_type enum (from Clang_AST.ml):
 *   0=NoInt, 1=SignedChar, 2=UnsignedChar, 3=SignedShort, 4=UnsignedShort,
 *   5=SignedInt, 6=UnsignedInt, 7=SignedLong, 8=UnsignedLong,
 *   9=SignedLongLong, 10=UnsignedLongLong
 */
function mlclang_get_target_info(target_options) {
    // Values for wasm32 target (32-bit pointers, little endian)
    return [0,  // tag for record
        target_options,  // 0: target_options
        6,   // 1: target_size_type: UnsignedInt
        9,   // 2: target_intmax_type: SignedLongLong
        5,   // 3: target_ptrdiff_type: SignedInt
        5,   // 4: target_intptr_type: SignedInt
        5,   // 5: target_wchar_type: SignedInt
        5,   // 6: target_wint_type: SignedInt
        4,   // 7: target_char16_type: UnsignedShort
        6,   // 8: target_char32_type: UnsignedInt
        9,   // 9: target_int64_type: SignedLongLong
        5,   // 10: target_sigatomic_type: SignedInt
        5,   // 11: target_processid_type: SignedInt
        32,  // 12: target_pointer_width
        32,  // 13: target_pointer_align
        8,   // 14: target_bool_width
        8,   // 15: target_bool_align
        8,   // 16: target_char_width
        8,   // 17: target_char_align
        16,  // 18: target_short_width
        16,  // 19: target_short_align
        32,  // 20: target_int_width
        32,  // 21: target_int_align
        32,  // 22: target_long_width
        32,  // 23: target_long_align
        64,  // 24: target_long_long_width
        64,  // 25: target_long_long_align
        16,  // 26: target_half_width
        16,  // 27: target_half_align
        32,  // 28: target_float_width
        32,  // 29: target_float_align
        64,  // 30: target_double_width
        64,  // 31: target_double_align
        128, // 32: target_long_double_width
        128, // 33: target_long_double_align
        128, // 34: target_float128_width
        128, // 35: target_float128_align
        0,   // 36: target_large_array_min_width
        0,   // 37: target_large_array_align
        64,  // 38: target_suitable_align (in bits)
        0,   // 39: target_big_endian: false
        0,   // 40: target_TLS_supported: false
        0,   // 41: target_has_int128: false
        0,   // 42: target_has_float128_type: false
        caml_int64_of_int32(0)  // 43: target_null_pointer_value (Int64.t)
    ];
}

//Provides: mlclang_get_default_target_options
//Requires: caml_string_of_jsstring
/**
 * Returns the default target_options.
 *
 * Based on Clang_to_ml.cc mlclang_get_default_target_options function.
 * Uses the default target triple "wasm32-unknown-unknown" for browser environment.
 *
 * type target_options = {
 *   target_triple: string;                    // 0
 *   target_host_triple: string;               // 1
 *   target_CPU: string;                       // 2
 *   target_FP_math: string;                   // 3
 *   target_ABI: string;                       // 4
 *   target_EABI_version: target_EABI;         // 5  (0=Unknown, 1=Default, ...)
 *   target_linker_version: string;            // 6
 *   target_features_as_written: string list;  // 7
 *   target_features: string list;             // 8
 * }
 */
function mlclang_get_default_target_options() {
    var empty_string = caml_string_of_jsstring("");
    var empty_list = 0;  // OCaml empty list

    return [0,  // tag for record
        caml_string_of_jsstring("wasm32-unknown-unknown"),  // 0: target_triple
        empty_string,  // 1: target_host_triple
        empty_string,  // 2: target_CPU
        empty_string,  // 3: target_FP_math
        empty_string,  // 4: target_ABI
        1,             // 5: target_EABI_version: Target_EABI_Default
        empty_string,  // 6: target_linker_version
        empty_list,    // 7: target_features_as_written
        empty_list     // 8: target_features
    ];
}

//Provides: mlclang_parse
//Requires: caml_jsstring_of_string
/**
 * mlclang_parse - Parse a C file and return OCaml AST
 *
 * Signature: command:string -> target:target_options -> filename:string -> args:string array -> parse_result
 *
 * This is the JavaScript replacement for the native mlclang_parse function.
 * The parse result must be pre-computed and cached before MOPSA calls this function,
 * because ClangParser (WASM) is async but this function must be synchronous.
 */
function mlclang_parse(command, target, filename, args) {
    var js_filename = caml_jsstring_of_string(filename);

    console.log('[mlclang_parse] Called for file:', js_filename);

    // Look up the cached parse result
    if (typeof globalThis.mlclang_parse_cache === 'undefined') {
        globalThis.mlclang_parse_cache = {};
    }

    var cached = globalThis.mlclang_parse_cache[js_filename];
    if (cached) {
        console.log('[mlclang_parse] Returning cached parse result for:', js_filename);
        return cached;
    }

    // No cached result - this is an error
    console.error('[mlclang_parse] No cached parse result for:', js_filename);
    console.error('[mlclang_parse] Available cached files:', Object.keys(globalThis.mlclang_parse_cache));
    throw new Error('No cached parse result for ' + js_filename + '. Call parseAndCacheC() before analyze().');
}

//Provides: exit
function exit() { return 0; }