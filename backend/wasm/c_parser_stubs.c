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

CAMLprim value mlclang_dump_block(value recursive, value v) {
    CAMLparam2(recursive, v);
    caml_failwith("mlclang_dump_block not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mlclang_get_default_target_options(value unit) {
    CAMLparam1(unit);
    // caml_failwith("mlclang_get_default_target_options not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mlclang_get_target_info(value target_options) {
    CAMLparam1(target_options);
    // caml_failwith("mlclang_get_target_info not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mlclang_parse(value command, value target, value filename, value args) {
    CAMLparam4(command, target, filename, args);
    caml_failwith("mlclang_parse not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mopsa_c_parser_init(value unit) {
    CAMLparam1(unit);
    caml_failwith("mopsa_c_parser_init not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mopsa_c_parser_parse(value filename, value options) {
    CAMLparam2(filename, options);
    caml_failwith("mopsa_c_parser_parse not implemented");
    CAMLreturn(Val_unit);
}

CAMLprim value mopsa_c_parser_cleanup(value unit) {
    CAMLparam1(unit);
    caml_failwith("mopsa_c_parser_cleanup not implemented");
    CAMLreturn(Val_unit);
}
