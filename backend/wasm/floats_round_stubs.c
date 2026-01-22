/*
 * Stub implementation of floats_round.c for WASM/WASI
 *
 * WASI does not support fenv.h rounding mode control, so we provide
 * stub implementations that use the default rounding mode (round-to-nearest).
 *
 * WARNING: These stubs do NOT provide correct rounding behavior!
 * They are only meant for testing and development purposes.
 */

#include <caml/mlvalues.h>
#include <caml/memory.h>
#include <caml/alloc.h>

#include <math.h>
#include <float.h>
#include <stdint.h>

/* Rounding mode stubs - do nothing since WASM doesn't support rounding control */
CAMLprim value ml_round_near(value unit) { return Val_unit; }
CAMLprim value ml_round_zero(value unit) { return Val_unit; }
CAMLprim value ml_round_up(value unit) { return Val_unit; }
CAMLprim value ml_round_down(value unit) { return Val_unit; }

/* Scalar arithmetic - stub versions using default rounding */
CAMLprim value ml_add_dbl_up(value va, value vb) {
  return caml_copy_double(Double_val(va) + Double_val(vb));
}
CAMLprim value ml_add_dbl_down(value va, value vb) {
  return caml_copy_double(Double_val(va) + Double_val(vb));
}
CAMLprim value ml_add_dbl_zero(value va, value vb) {
  return caml_copy_double(Double_val(va) + Double_val(vb));
}
CAMLprim value ml_add_sgl_up(value va, value vb) {
  return caml_copy_double((float)Double_val(va) + (float)Double_val(vb));
}
CAMLprim value ml_add_sgl_down(value va, value vb) {
  return caml_copy_double((float)Double_val(va) + (float)Double_val(vb));
}
CAMLprim value ml_add_sgl_zero(value va, value vb) {
  return caml_copy_double((float)Double_val(va) + (float)Double_val(vb));
}

CAMLprim value ml_sub_dbl_up(value va, value vb) {
  return caml_copy_double(Double_val(va) - Double_val(vb));
}
CAMLprim value ml_sub_dbl_down(value va, value vb) {
  return caml_copy_double(Double_val(va) - Double_val(vb));
}
CAMLprim value ml_sub_dbl_zero(value va, value vb) {
  return caml_copy_double(Double_val(va) - Double_val(vb));
}
CAMLprim value ml_sub_sgl_up(value va, value vb) {
  return caml_copy_double((float)Double_val(va) - (float)Double_val(vb));
}
CAMLprim value ml_sub_sgl_down(value va, value vb) {
  return caml_copy_double((float)Double_val(va) - (float)Double_val(vb));
}
CAMLprim value ml_sub_sgl_zero(value va, value vb) {
  return caml_copy_double((float)Double_val(va) - (float)Double_val(vb));
}

CAMLprim value ml_mul_dbl_up(value va, value vb) {
  return caml_copy_double(Double_val(va) * Double_val(vb));
}
CAMLprim value ml_mul_dbl_down(value va, value vb) {
  return caml_copy_double(Double_val(va) * Double_val(vb));
}
CAMLprim value ml_mul_dbl_zero(value va, value vb) {
  return caml_copy_double(Double_val(va) * Double_val(vb));
}
CAMLprim value ml_mul_sgl_up(value va, value vb) {
  return caml_copy_double((float)Double_val(va) * (float)Double_val(vb));
}
CAMLprim value ml_mul_sgl_down(value va, value vb) {
  return caml_copy_double((float)Double_val(va) * (float)Double_val(vb));
}
CAMLprim value ml_mul_sgl_zero(value va, value vb) {
  return caml_copy_double((float)Double_val(va) * (float)Double_val(vb));
}

CAMLprim value ml_div_dbl_up(value va, value vb) {
  return caml_copy_double(Double_val(va) / Double_val(vb));
}
CAMLprim value ml_div_dbl_down(value va, value vb) {
  return caml_copy_double(Double_val(va) / Double_val(vb));
}
CAMLprim value ml_div_dbl_zero(value va, value vb) {
  return caml_copy_double(Double_val(va) / Double_val(vb));
}
CAMLprim value ml_div_sgl_up(value va, value vb) {
  return caml_copy_double((float)Double_val(va) / (float)Double_val(vb));
}
CAMLprim value ml_div_sgl_down(value va, value vb) {
  return caml_copy_double((float)Double_val(va) / (float)Double_val(vb));
}
CAMLprim value ml_div_sgl_zero(value va, value vb) {
  return caml_copy_double((float)Double_val(va) / (float)Double_val(vb));
}

CAMLprim value ml_sqrt_dbl_up(value va) {
  return caml_copy_double(sqrt(Double_val(va)));
}
CAMLprim value ml_sqrt_dbl_down(value va) {
  return caml_copy_double(sqrt(Double_val(va)));
}
CAMLprim value ml_sqrt_dbl_zero(value va) {
  return caml_copy_double(sqrt(Double_val(va)));
}
CAMLprim value ml_sqrt_sgl_up(value va) {
  return caml_copy_double(sqrtf((float)Double_val(va)));
}
CAMLprim value ml_sqrt_sgl_down(value va) {
  return caml_copy_double(sqrtf((float)Double_val(va)));
}
CAMLprim value ml_sqrt_sgl_zero(value va) {
  return caml_copy_double(sqrtf((float)Double_val(va)));
}

CAMLprim value ml_round_dbl_up(value va) {
  return caml_copy_double(rint(Double_val(va)));
}
CAMLprim value ml_round_dbl_down(value va) {
  return caml_copy_double(rint(Double_val(va)));
}
CAMLprim value ml_round_dbl_zero(value va) {
  return caml_copy_double(rint(Double_val(va)));
}
CAMLprim value ml_round_sgl_up(value va) {
  return caml_copy_double(rintf((float)Double_val(va)));
}
CAMLprim value ml_round_sgl_down(value va) {
  return caml_copy_double(rintf((float)Double_val(va)));
}
CAMLprim value ml_round_sgl_zero(value va) {
  return caml_copy_double(rintf((float)Double_val(va)));
}

/* Binary representation */
CAMLprim value ml_bits_of_double(value d) {
  CAMLparam1(d);
  union { int64_t i; double d; } v;
  v.d = Double_val(d);
  CAMLreturn(caml_copy_int64(v.i));
}

CAMLprim value ml_double_of_bits(value d) {
  CAMLparam1(d);
  union { int64_t i; double d; } v;
  v.i = Int64_val(d);
  CAMLreturn(caml_copy_double(v.d));
}

CAMLprim value ml_bits_of_float(value d) {
  CAMLparam1(d);
  union { int32_t i; float f; } v;
  v.f = Double_val(d);
  CAMLreturn(caml_copy_int32(v.i));
}

CAMLprim value ml_float_of_bits(value d) {
  CAMLparam1(d);
  union { int32_t i; float f; } v;
  v.i = Int32_val(d);
  CAMLreturn(caml_copy_double(v.f));
}

/* Interval operations - helper macros */
#define get_l(itv) (Double_field((itv), 0))
#define get_u(itv) (Double_field((itv), 1))
#define get_sl(itv) ((float)Double_field((itv), 0))
#define get_su(itv) ((float)Double_field((itv), 1))

/* Add intervals */
CAMLprim value ml_add_dbl_itv_near(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_dbl_itv_up(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_dbl_itv_down(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_dbl_itv_zero(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_dbl_itv_outer(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_dbl_itv_inner(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) + get_l(b));
  Store_double_field(r, 1, get_u(a) + get_u(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_near(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_up(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_down(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_zero(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_outer(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}
CAMLprim value ml_add_sgl_itv_inner(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) + get_sl(b));
  Store_double_field(r, 1, get_su(a) + get_su(b));
  return Val_unit;
}

/* Sub intervals */
CAMLprim value ml_sub_dbl_itv_near(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_dbl_itv_up(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_dbl_itv_down(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_dbl_itv_zero(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_dbl_itv_outer(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_dbl_itv_inner(value a, value b, value r) {
  Store_double_field(r, 0, get_l(a) - get_u(b));
  Store_double_field(r, 1, get_u(a) - get_l(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_near(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_up(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_down(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_zero(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_outer(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}
CAMLprim value ml_sub_sgl_itv_inner(value a, value b, value r) {
  Store_double_field(r, 0, get_sl(a) - get_su(b));
  Store_double_field(r, 1, get_su(a) - get_sl(b));
  return Val_unit;
}

/* Mul intervals - helper for min/max of 4 values */
static inline void mul_itv_dbl(value a, value b, value r) {
  double l1 = get_l(a), l2 = get_l(b), h1 = get_u(a), h2 = get_u(b);
  double ll = l1*l2, lh = l1*h2, hl = h1*l2, hh = h1*h2;
  Store_double_field(r, 0, fmin(fmin(ll,hh), fmin(lh,hl)));
  Store_double_field(r, 1, fmax(fmax(ll,hh), fmax(lh,hl)));
}
static inline void mul_itv_sgl(value a, value b, value r) {
  float l1 = get_sl(a), l2 = get_sl(b), h1 = get_su(a), h2 = get_su(b);
  float ll = l1*l2, lh = l1*h2, hl = h1*l2, hh = h1*h2;
  Store_double_field(r, 0, fminf(fminf(ll,hh), fminf(lh,hl)));
  Store_double_field(r, 1, fmaxf(fmaxf(ll,hh), fmaxf(lh,hl)));
}

CAMLprim value ml_mul_dbl_itv_near(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_dbl_itv_up(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_dbl_itv_down(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_dbl_itv_zero(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_dbl_itv_outer(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_dbl_itv_inner(value a, value b, value r) { mul_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_near(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_up(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_down(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_zero(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_outer(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_mul_sgl_itv_inner(value a, value b, value r) { mul_itv_sgl(a,b,r); return Val_unit; }

/* Divpos intervals */
static inline void divpos_itv_dbl(value a, value b, value r) {
  double l1 = get_l(a), l2 = get_l(b), h1 = get_u(a), h2 = get_u(b);
  double ll = l1/l2, lh = l1/h2, hl = h1/l2, hh = h1/h2;
  Store_double_field(r, 0, fmin(fmin(ll,hh), fmin(lh,hl)));
  Store_double_field(r, 1, fmax(fmax(ll,hh), fmax(lh,hl)));
}
static inline void divpos_itv_sgl(value a, value b, value r) {
  float l1 = get_sl(a), l2 = get_sl(b), h1 = get_su(a), h2 = get_su(b);
  float ll = l1/l2, lh = l1/h2, hl = h1/l2, hh = h1/h2;
  Store_double_field(r, 0, fminf(fminf(ll,hh), fminf(lh,hl)));
  Store_double_field(r, 1, fmaxf(fmaxf(ll,hh), fmaxf(lh,hl)));
}

CAMLprim value ml_divpos_dbl_itv_near(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_dbl_itv_up(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_dbl_itv_down(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_dbl_itv_zero(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_dbl_itv_outer(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_dbl_itv_inner(value a, value b, value r) { divpos_itv_dbl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_near(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_up(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_down(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_zero(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_outer(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }
CAMLprim value ml_divpos_sgl_itv_inner(value a, value b, value r) { divpos_itv_sgl(a,b,r); return Val_unit; }

/* String parsing - stub versions (return 0) */
CAMLprim value ml_of_string_dbl_up(value s) {
  CAMLparam1(s);
  CAMLreturn(caml_copy_double(0.0));
}
CAMLprim value ml_of_string_dbl_down(value s) {
  CAMLparam1(s);
  CAMLreturn(caml_copy_double(0.0));
}
CAMLprim value ml_of_string_sgl_up(value s) {
  CAMLparam1(s);
  CAMLreturn(caml_copy_double(0.0));
}
CAMLprim value ml_of_string_sgl_down(value s) {
  CAMLparam1(s);
  CAMLreturn(caml_copy_double(0.0));
}

