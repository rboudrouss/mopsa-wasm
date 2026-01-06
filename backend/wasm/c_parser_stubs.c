/*
* dummy stubs for C parser functions
*/

#include <caml/mlvalues.h>
#include <caml/memory.h>
#include <caml/alloc.h>
#include <caml/fail.h>

/* Stub for C parser initialization */
CAMLprim value mopsa_c_parser_init(value unit) {
    CAMLparam1(unit);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}

/* Stub for C parser parse function */
CAMLprim value mopsa_c_parser_parse(value filename, value options) {
    CAMLparam2(filename, options);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}

/* Stub for C parser cleanup */
CAMLprim value mopsa_c_parser_cleanup(value unit) {
    CAMLparam1(unit);
    caml_failwith("C parser not available in WASM build");
    CAMLreturn(Val_unit);
}

