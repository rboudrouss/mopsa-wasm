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
