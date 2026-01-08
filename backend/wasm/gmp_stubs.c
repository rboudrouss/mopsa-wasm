/**
 * Stub implementations of GMP/MPFR/Apron functions for WASM
 * 
 * These are minimal stub implementations that allow MOPSA to load
 * without the full GMP/MPFR/Apron libraries. They will fail if actually
 * called, but allow the bytecode to load successfully.
 */

#include <stddef.h>
#include <stdint.h>

// Opaque types for GMP/MPFR structures
typedef struct { int dummy; } __mpz_struct;
typedef struct { int dummy; } __mpq_struct;
typedef struct { int dummy; } __mpf_struct;
typedef struct { int dummy; } __mpfr_struct;

typedef __mpz_struct mpz_t[1];
typedef __mpq_struct mpq_t[1];
typedef __mpf_struct mpf_t[1];
typedef __mpfr_struct mpfr_t[1];

// GMP integer functions (mpz)
void __gmpz_init(mpz_t x) {}
void __gmpz_clear(mpz_t x) {}
void __gmpz_set_si(mpz_t rop, long op) {}
void __gmpz_set_ui(mpz_t rop, unsigned long op) {}
void __gmpz_set(mpz_t rop, const mpz_t op) {}
void __gmpz_set_d(mpz_t rop, double op) {}
long __gmpz_get_si(const mpz_t op) { return 0; }
unsigned long __gmpz_get_ui(const mpz_t op) { return 0; }
double __gmpz_get_d(const mpz_t op) { return 0.0; }
void __gmpz_add(mpz_t rop, const mpz_t op1, const mpz_t op2) {}
void __gmpz_add_ui(mpz_t rop, const mpz_t op1, unsigned long op2) {}
void __gmpz_sub(mpz_t rop, const mpz_t op1, const mpz_t op2) {}
void __gmpz_sub_ui(mpz_t rop, const mpz_t op1, unsigned long op2) {}
void __gmpz_mul(mpz_t rop, const mpz_t op1, const mpz_t op2) {}
void __gmpz_mul_2exp(mpz_t rop, const mpz_t op1, unsigned long op2) {}
void __gmpz_cdiv_q(mpz_t q, const mpz_t n, const mpz_t d) {}
void __gmpz_cdiv_qr(mpz_t q, mpz_t r, const mpz_t n, const mpz_t d) {}
void __gmpz_cdiv_q_2exp(mpz_t q, const mpz_t n, unsigned long b) {}
void __gmpz_fdiv_q(mpz_t q, const mpz_t n, const mpz_t d) {}
void __gmpz_fdiv_q_2exp(mpz_t q, const mpz_t n, unsigned long b) {}
void __gmpz_tdiv_q(mpz_t q, const mpz_t n, const mpz_t d) {}
void __gmpz_tdiv_q_2exp(mpz_t q, const mpz_t n, unsigned long b) {}
int __gmpz_cmp(const mpz_t op1, const mpz_t op2) { return 0; }
int __gmpz_cmp_si(const mpz_t op1, long op2) { return 0; }
int __gmpz_cmp_ui(const mpz_t op1, unsigned long op2) { return 0; }
void __gmpz_gcd(mpz_t rop, const mpz_t op1, const mpz_t op2) {}
void __gmpz_lcm(mpz_t rop, const mpz_t op1, const mpz_t op2) {}
void __gmpz_mod(mpz_t r, const mpz_t n, const mpz_t d) {}
void __gmpz_divexact(mpz_t q, const mpz_t n, const mpz_t d) {}
void __gmpz_sqrt(mpz_t rop, const mpz_t op) {}
int __gmpz_root(mpz_t rop, const mpz_t op, unsigned long n) { return 0; }
void __gmpz_pow_ui(mpz_t rop, const mpz_t base, unsigned long exp) {}
size_t __gmpz_sizeinbase(const mpz_t op, int base) { return 0; }
char* __gmpz_get_str(char *str, int base, const mpz_t op) { return NULL; }
size_t __gmpz_out_str(void *stream, int base, const mpz_t op) { return 0; }
void __gmpz_init_set(mpz_t rop, const mpz_t op) {}
void __gmpz_init_set_si(mpz_t rop, long op) {}
size_t __gmpz_export(void *rop, size_t *countp, int order, size_t size, int endian, size_t nails, const mpz_t op) { return 0; }
void __gmpz_import(mpz_t rop, size_t count, int order, size_t size, int endian, size_t nails, const void *op) {}
int __gmpn_perfect_square_p(const void *op, size_t n) { return 0; }

// GMP rational functions (mpq)
void __gmpq_init(mpq_t x) {}
void __gmpq_clear(mpq_t x) {}
void __gmpq_set(mpq_t rop, const mpq_t op) {}
void __gmpq_set_si(mpq_t rop, long num, unsigned long den) {}
void __gmpq_set_ui(mpq_t rop, unsigned long num, unsigned long den) {}
void __gmpq_set_d(mpq_t rop, double op) {}
void __gmpq_add(mpq_t sum, const mpq_t addend1, const mpq_t addend2) {}
void __gmpq_sub(mpq_t difference, const mpq_t minuend, const mpq_t subtrahend) {}
void __gmpq_mul(mpq_t product, const mpq_t multiplier, const mpq_t multiplicand) {}
void __gmpq_div(mpq_t quotient, const mpq_t dividend, const mpq_t divisor) {}
void __gmpq_mul_2exp(mpq_t rop, const mpq_t op1, unsigned long op2) {}
void __gmpq_div_2exp(mpq_t rop, const mpq_t op1, unsigned long op2) {}
int __gmpq_cmp(const mpq_t op1, const mpq_t op2) { return 0; }
int __gmpq_cmp_si(const mpq_t op1, long num2, unsigned long den2) { return 0; }
int __gmpq_equal(const mpq_t op1, const mpq_t op2) { return 0; }
void __gmpq_canonicalize(mpq_t op) {}
void __gmpq_inv(mpq_t inverted_number, const mpq_t number) {}
char* __gmpq_get_str(char *str, int base, const mpq_t op) { return NULL; }
size_t __gmpq_out_str(void *stream, int base, const mpq_t op) { return 0; }

// MPFR functions
void mpfr_init(mpfr_t x) {}
void mpfr_init2(mpfr_t x, long prec) {}
void mpfr_clear(mpfr_t x) {}
void mpfr_set_prec(mpfr_t x, long prec) {}
int mpfr_set_d(mpfr_t rop, double op, int rnd) { return 0; }
int mpfr_set_ld(mpfr_t rop, long double op, int rnd) { return 0; }
int mpfr_set_z(mpfr_t rop, const mpz_t op, int rnd) { return 0; }
int mpfr_set_q(mpfr_t rop, const mpq_t op, int rnd) { return 0; }
int mpfr_set_si_2exp(mpfr_t rop, long op, long e, int rnd) { return 0; }
int mpfr_set_ui_2exp(mpfr_t rop, unsigned long op, long e, int rnd) { return 0; }
int mpfr_set4(mpfr_t rop, const mpfr_t op, int rnd, int sign) { return 0; }
double mpfr_get_d(const mpfr_t op, int rnd) { return 0.0; }
long double mpfr_get_ld(const mpfr_t op, int rnd) { return 0.0; }
long mpfr_get_si(const mpfr_t op, int rnd) { return 0; }
int mpfr_get_z(mpz_t rop, const mpfr_t op, int rnd) { return 0; }
long mpfr_get_z_2exp(mpz_t rop, const mpfr_t op) { return 0; }
int mpfr_add(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_add_ui(mpfr_t rop, const mpfr_t op1, unsigned long op2, int rnd) { return 0; }
int mpfr_sub(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_sub_ui(mpfr_t rop, const mpfr_t op1, unsigned long op2, int rnd) { return 0; }
int mpfr_mul(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_mul_2si(mpfr_t rop, const mpfr_t op1, long op2, int rnd) { return 0; }
int mpfr_div(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_div_2ui(mpfr_t rop, const mpfr_t op1, unsigned long op2, int rnd) { return 0; }
int mpfr_ui_div(mpfr_t rop, unsigned long op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_sqrt(mpfr_t rop, const mpfr_t op, int rnd) { return 0; }
int mpfr_rootn_ui(mpfr_t rop, const mpfr_t op, unsigned long k, int rnd) { return 0; }
int mpfr_pow_ui(mpfr_t rop, const mpfr_t op1, unsigned long op2, int rnd) { return 0; }
int mpfr_neg(mpfr_t rop, const mpfr_t op, int rnd) { return 0; }
int mpfr_cmp3(const mpfr_t op1, const mpfr_t op2, int s) { return 0; }
int mpfr_cmp_d(const mpfr_t op1, double op2) { return 0; }
int mpfr_cmp_ld(const mpfr_t op1, long double op2) { return 0; }
int mpfr_cmp_si_2exp(const mpfr_t op1, long op2, long e) { return 0; }
int mpfr_cmp_q(const mpfr_t op1, const mpq_t op2) { return 0; }
int mpfr_equal_p(const mpfr_t op1, const mpfr_t op2) { return 0; }
int mpfr_sgn(const mpfr_t op) { return 0; }
int mpfr_number_p(const mpfr_t op) { return 0; }
int mpfr_integer_p(const mpfr_t op) { return 0; }
int mpfr_rint_floor(mpfr_t rop, const mpfr_t op, int rnd) { return 0; }
int mpfr_rint_ceil(mpfr_t rop, const mpfr_t op, int rnd) { return 0; }
int mpfr_rint_trunc(mpfr_t rop, const mpfr_t op, int rnd) { return 0; }
void mpfr_set_inf(mpfr_t x, int sign) {}
void mpfr_set_erangeflag(void) {}
void mpfr_swap(mpfr_t x, mpfr_t y) {}
int mpfr_min(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
int mpfr_max(mpfr_t rop, const mpfr_t op1, const mpfr_t op2, int rnd) { return 0; }
char* mpfr_get_str(char *str, long *expptr, int b, size_t n, const mpfr_t op, int rnd) { return NULL; }
void mpfr_free_str(char *str) {}
size_t __gmpfr_out_str(void *stream, int base, size_t n_digits, const mpfr_t op, int rnd) { return 0; }
long __gmpfr_mpfr_get_sj(const mpfr_t op, int rnd) { return 0; }

// OCaml CAMLidl stubs for GMP/MPFR
// These are the functions that mlgmpidl expects to find

#include <caml/mlvalues.h>
#include <caml/memory.h>
#include <caml/alloc.h>
#include <caml/custom.h>
#include <caml/fail.h>

// All OCaml primitives for mlgmpidl and Apron are auto-generated in gmp_ocaml_stubs.c

// Additional version functions
value camlidl_version_version(value v1, value v2, value v3, value v4, value v5, value v6, value v7) {
    return caml_copy_string("0.0.0-stub");
}

value camlidl_version_version_micro(value v1, value v2, value v3, value v4, value v5, value v6, value v7) {
    return Val_int(0);
}

value camlidl_version_version_minor(value v1, value v2, value v3, value v4, value v5, value v6, value v7) {
    return Val_int(0);
}

value camlidl_version_version_major(value v1, value v2, value v3, value v4, value v5, value v6, value v7) {
    return Val_int(0);
}

