/*
 * Dummy stubs for C parser functions
 */

#include <caml/mlvalues.h>
#include <caml/memory.h>
#include <caml/alloc.h>
#include <caml/fail.h>

/* External JavaScript function for emitting messages */
extern void js_mopsa_emit(value str);

/* OCaml primitive for mopsa_emit */
CAMLprim value mopsa_emit(value str) {
    CAMLparam1(str);
    js_mopsa_emit(str);
    CAMLreturn(Val_unit);
}

/* Stub for mlclang_dump_block - debugging utility */
CAMLprim value mlclang_dump_block(value recursive, value v) {
    CAMLparam2(recursive, v);
    /* Silent no-op for debugging function in WASM */
    CAMLreturn(Val_unit);
}

/* Stub for mlclang_get_default_target_options */
CAMLprim value mlclang_get_default_target_options(value unit) {
    CAMLparam1(unit);
    caml_failwith("Clang parser not available in WASM build");
    CAMLreturn(Val_unit);
}

/* Stub for mlclang_get_target_info */
CAMLprim value mlclang_get_target_info(value target_options) {
    CAMLparam1(target_options);
    caml_failwith("Clang parser not available in WASM build");
    CAMLreturn(Val_unit);
}

/* Stub for mlclang_parse */
CAMLprim value mlclang_parse(value command, value target, value filename, value args) {
    CAMLparam4(command, target, filename, args);
    caml_failwith("Clang parser not available in WASM build");
    CAMLreturn(Val_unit);
}

/* Legacy stubs (if needed) */
CAMLprim value mopsa_c_parser_init(value unit) {
    CAMLparam1(unit);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}

CAMLprim value mopsa_c_parser_parse(value filename, value options) {
    CAMLparam2(filename, options);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}

CAMLprim value mopsa_c_parser_cleanup(value unit) {
    CAMLparam1(unit);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}
