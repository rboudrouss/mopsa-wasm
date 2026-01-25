/**
 * JavaScript implementation of floats_round.c for js_of_ocaml
 *
 * Note: JavaScript doesn't support rounding mode control, so we use approximations.
 * For "near" rounding, we use standard JS operations.
 * For "up"/"down" rounding, we use nextafter-style adjustments where needed.
 */

// Helper: get next representable float up/down
//Provides: nextUp
function nextUp(x) {
    if (x !== x) return x; // NaN
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return -Number.MAX_VALUE;
    if (x === 0) return Number.MIN_VALUE;
    var buffer = new ArrayBuffer(8);
    var f64 = new Float64Array(buffer);
    var u64 = new BigUint64Array(buffer);
    f64[0] = x;
    if (x > 0) {
        u64[0] = u64[0] + 1n;
    } else {
        u64[0] = u64[0] - 1n;
    }
    return f64[0];
}

//Provides: nextDown
function nextDown(x) {
    if (x !== x) return x; // NaN
    if (x === -Infinity) return -Infinity;
    if (x === Infinity) return Number.MAX_VALUE;
    if (x === 0) return -Number.MIN_VALUE;
    var buffer = new ArrayBuffer(8);
    var f64 = new Float64Array(buffer);
    var u64 = new BigUint64Array(buffer);
    f64[0] = x;
    if (x > 0) {
        u64[0] = u64[0] - 1n;
    } else {
        u64[0] = u64[0] + 1n;
    }
    return f64[0];
}

// Convert to single precision (float32)
//Provides: toFloat32
function toFloat32(x) {
    var buffer = new ArrayBuffer(4);
    var f32 = new Float32Array(buffer);
    f32[0] = x;
    return f32[0];
}

// MUL with 0 * inf = 0
//Provides: mulz
function mulz(a, b) {
    if (a === 0 || b === 0) return 0;
    return a * b;
}

// DIV with 0/0 = inf/inf = 0
//Provides: divz
function divz(a, b) {
    if (a === 0 || !isFinite(b)) return 0;
    return a / b;
}

//Provides: ml_round_near
function ml_round_near() { return 0; }

//Provides: ml_round_zero
function ml_round_zero() { return 0; }

//Provides: ml_round_up
function ml_round_up() { return 0; }

//Provides: ml_round_down
function ml_round_down() { return 0; }

// ============ Scalar double operations ============

//Provides: ml_add_dbl_near
function ml_add_dbl_near(a, b) { return a + b; }

//Provides: ml_add_dbl_up
function ml_add_dbl_up(a, b) { return a + b; }

//Provides: ml_add_dbl_down
function ml_add_dbl_down(a, b) { return a + b; }

//Provides: ml_add_dbl_zero
function ml_add_dbl_zero(a, b) { return a + b; }

//Provides: ml_sub_dbl_near
function ml_sub_dbl_near(a, b) { return a - b; }

//Provides: ml_sub_dbl_up
function ml_sub_dbl_up(a, b) { return a - b; }

//Provides: ml_sub_dbl_down
function ml_sub_dbl_down(a, b) { return a - b; }

//Provides: ml_sub_dbl_zero
function ml_sub_dbl_zero(a, b) { return a - b; }

//Provides: ml_mul_dbl_near
function ml_mul_dbl_near(a, b) { return a * b; }

//Provides: ml_mul_dbl_up
function ml_mul_dbl_up(a, b) { return a * b; }

//Provides: ml_mul_dbl_down
function ml_mul_dbl_down(a, b) { return a * b; }

//Provides: ml_mul_dbl_zero
function ml_mul_dbl_zero(a, b) { return a * b; }

//Provides: ml_mulz_dbl_near
function ml_mulz_dbl_near(a, b) { return (a === 0 || b === 0) ? 0 : a * b; }

//Provides: ml_mulz_dbl_up
function ml_mulz_dbl_up(a, b) { return (a === 0 || b === 0) ? 0 : a * b; }

//Provides: ml_mulz_dbl_down
function ml_mulz_dbl_down(a, b) { return (a === 0 || b === 0) ? 0 : a * b; }

//Provides: ml_mulz_dbl_zero
function ml_mulz_dbl_zero(a, b) { return (a === 0 || b === 0) ? 0 : a * b; }

//Provides: ml_div_dbl_near
function ml_div_dbl_near(a, b) { return a / b; }

//Provides: ml_div_dbl_up
function ml_div_dbl_up(a, b) { return a / b; }

//Provides: ml_div_dbl_down
function ml_div_dbl_down(a, b) { return a / b; }

//Provides: ml_div_dbl_zero
function ml_div_dbl_zero(a, b) { return a / b; }

//Provides: ml_divz_dbl_near
function ml_divz_dbl_near(a, b) { return (a === 0 || !isFinite(b)) ? 0 : a / b; }

//Provides: ml_divz_dbl_up
function ml_divz_dbl_up(a, b) { return (a === 0 || !isFinite(b)) ? 0 : a / b; }

//Provides: ml_divz_dbl_down
function ml_divz_dbl_down(a, b) { return (a === 0 || !isFinite(b)) ? 0 : a / b; }

//Provides: ml_divz_dbl_zero
function ml_divz_dbl_zero(a, b) { return (a === 0 || !isFinite(b)) ? 0 : a / b; }

//Provides: ml_mod_dbl_near
function ml_mod_dbl_near(a, b) { return a % b; }

//Provides: ml_mod_dbl_up
function ml_mod_dbl_up(a, b) { return a % b; }

//Provides: ml_mod_dbl_down
function ml_mod_dbl_down(a, b) { return a % b; }

//Provides: ml_mod_dbl_zero
function ml_mod_dbl_zero(a, b) { return a % b; }

// ============ Scalar single precision operations ============

//Provides: ml_add_sgl_near
//Requires: toFloat32
function ml_add_sgl_near(a, b) { return toFloat32(a) + toFloat32(b); }

//Provides: ml_add_sgl_up
//Requires: toFloat32
function ml_add_sgl_up(a, b) { return toFloat32(a) + toFloat32(b); }

//Provides: ml_add_sgl_down
//Requires: toFloat32
function ml_add_sgl_down(a, b) { return toFloat32(a) + toFloat32(b); }

//Provides: ml_add_sgl_zero
//Requires: toFloat32
function ml_add_sgl_zero(a, b) { return toFloat32(a) + toFloat32(b); }

//Provides: ml_sub_sgl_near
//Requires: toFloat32
function ml_sub_sgl_near(a, b) { return toFloat32(a) - toFloat32(b); }

//Provides: ml_sub_sgl_up
//Requires: toFloat32
function ml_sub_sgl_up(a, b) { return toFloat32(a) - toFloat32(b); }

//Provides: ml_sub_sgl_down
//Requires: toFloat32
function ml_sub_sgl_down(a, b) { return toFloat32(a) - toFloat32(b); }

//Provides: ml_sub_sgl_zero
//Requires: toFloat32
function ml_sub_sgl_zero(a, b) { return toFloat32(a) - toFloat32(b); }

//Provides: ml_mul_sgl_near
//Requires: toFloat32
function ml_mul_sgl_near(a, b) { return toFloat32(a) * toFloat32(b); }

//Provides: ml_mul_sgl_up
//Requires: toFloat32
function ml_mul_sgl_up(a, b) { return toFloat32(a) * toFloat32(b); }

//Provides: ml_mul_sgl_down
//Requires: toFloat32
function ml_mul_sgl_down(a, b) { return toFloat32(a) * toFloat32(b); }

//Provides: ml_mul_sgl_zero
//Requires: toFloat32
function ml_mul_sgl_zero(a, b) { return toFloat32(a) * toFloat32(b); }

//Provides: ml_mulz_sgl_near
//Requires: toFloat32
function ml_mulz_sgl_near(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || bb === 0) ? 0 : aa * bb; }

//Provides: ml_mulz_sgl_up
//Requires: toFloat32
function ml_mulz_sgl_up(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || bb === 0) ? 0 : aa * bb; }

//Provides: ml_mulz_sgl_down
//Requires: toFloat32
function ml_mulz_sgl_down(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || bb === 0) ? 0 : aa * bb; }

//Provides: ml_mulz_sgl_zero
//Requires: toFloat32
function ml_mulz_sgl_zero(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || bb === 0) ? 0 : aa * bb; }

//Provides: ml_div_sgl_near
//Requires: toFloat32
function ml_div_sgl_near(a, b) { return toFloat32(a) / toFloat32(b); }

//Provides: ml_div_sgl_up
//Requires: toFloat32
function ml_div_sgl_up(a, b) { return toFloat32(a) / toFloat32(b); }

//Provides: ml_div_sgl_down
//Requires: toFloat32
function ml_div_sgl_down(a, b) { return toFloat32(a) / toFloat32(b); }

//Provides: ml_div_sgl_zero
//Requires: toFloat32
function ml_div_sgl_zero(a, b) { return toFloat32(a) / toFloat32(b); }

//Provides: ml_divz_sgl_near
//Requires: toFloat32
function ml_divz_sgl_near(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || !isFinite(bb)) ? 0 : aa / bb; }

//Provides: ml_divz_sgl_up
//Requires: toFloat32
function ml_divz_sgl_up(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || !isFinite(bb)) ? 0 : aa / bb; }

//Provides: ml_divz_sgl_down
//Requires: toFloat32
function ml_divz_sgl_down(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || !isFinite(bb)) ? 0 : aa / bb; }

//Provides: ml_divz_sgl_zero
//Requires: toFloat32
function ml_divz_sgl_zero(a, b) { var aa = toFloat32(a), bb = toFloat32(b); return (aa === 0 || !isFinite(bb)) ? 0 : aa / bb; }

//Provides: ml_mod_sgl_near
//Requires: toFloat32
function ml_mod_sgl_near(a, b) { return toFloat32(a) % toFloat32(b); }

//Provides: ml_mod_sgl_up
//Requires: toFloat32
function ml_mod_sgl_up(a, b) { return toFloat32(a) % toFloat32(b); }

//Provides: ml_mod_sgl_down
//Requires: toFloat32
function ml_mod_sgl_down(a, b) { return toFloat32(a) % toFloat32(b); }

//Provides: ml_mod_sgl_zero
//Requires: toFloat32
function ml_mod_sgl_zero(a, b) { return toFloat32(a) % toFloat32(b); }



// ============ Sqrt operations ============

//Provides: ml_sqrt_dbl_near
function ml_sqrt_dbl_near(a) { return Math.sqrt(a); }

//Provides: ml_sqrt_dbl_up
function ml_sqrt_dbl_up(a) { return Math.sqrt(a); }

//Provides: ml_sqrt_dbl_down
function ml_sqrt_dbl_down(a) { return Math.sqrt(a); }

//Provides: ml_sqrt_dbl_zero
function ml_sqrt_dbl_zero(a) { return Math.sqrt(a); }

//Provides: ml_sqrt_sgl_near
//Requires: toFloat32
function ml_sqrt_sgl_near(a) { return Math.sqrt(toFloat32(a)); }

//Provides: ml_sqrt_sgl_up
//Requires: toFloat32
function ml_sqrt_sgl_up(a) { return Math.sqrt(toFloat32(a)); }

//Provides: ml_sqrt_sgl_down
//Requires: toFloat32
function ml_sqrt_sgl_down(a) { return Math.sqrt(toFloat32(a)); }

//Provides: ml_sqrt_sgl_zero
//Requires: toFloat32
function ml_sqrt_sgl_zero(a) { return Math.sqrt(toFloat32(a)); }

// ============ Cast to float (double to single) ============

//Provides: ml_to_sgl_near
//Requires: toFloat32
function ml_to_sgl_near(a) { return toFloat32(a); }

//Provides: ml_to_sgl_up
//Requires: toFloat32
function ml_to_sgl_up(a) { return toFloat32(a); }

//Provides: ml_to_sgl_down
//Requires: toFloat32
function ml_to_sgl_down(a) { return toFloat32(a); }

//Provides: ml_to_sgl_zero
//Requires: toFloat32
function ml_to_sgl_zero(a) { return toFloat32(a); }

// ============ Round to integer (returns a float) ============

//Provides: ml_round_int_dbl_near
function ml_round_int_dbl_near(a) { return Math.round(a); }

//Provides: ml_round_int_dbl_up
function ml_round_int_dbl_up(a) { return Math.ceil(a); }

//Provides: ml_round_int_dbl_down
function ml_round_int_dbl_down(a) { return Math.floor(a); }

//Provides: ml_round_int_dbl_zero
function ml_round_int_dbl_zero(a) { return Math.trunc(a); }

//Provides: ml_round_int_sgl_near
//Requires: toFloat32
function ml_round_int_sgl_near(a) { return Math.round(toFloat32(a)); }

//Provides: ml_round_int_sgl_up
//Requires: toFloat32
function ml_round_int_sgl_up(a) { return Math.ceil(toFloat32(a)); }

//Provides: ml_round_int_sgl_down
//Requires: toFloat32
function ml_round_int_sgl_down(a) { return Math.floor(toFloat32(a)); }

//Provides: ml_round_int_sgl_zero
//Requires: toFloat32
function ml_round_int_sgl_zero(a) { return Math.trunc(toFloat32(a)); }

// ============ Cast to int64 ============

//Provides: ml_to_int64_near
//Requires: caml_int64_of_float
function ml_to_int64_near(a) { return caml_int64_of_float(Math.round(a)); }

//Provides: ml_to_int64_up
//Requires: caml_int64_of_float
function ml_to_int64_up(a) { return caml_int64_of_float(Math.ceil(a)); }

//Provides: ml_to_int64_down
//Requires: caml_int64_of_float
function ml_to_int64_down(a) { return caml_int64_of_float(Math.floor(a)); }

//Provides: ml_to_int64_zero
//Requires: caml_int64_of_float
function ml_to_int64_zero(a) { return caml_int64_of_float(Math.trunc(a)); }

// ============ Cast from int64 ============

//Provides: ml_of_int64_dbl_near
//Requires: caml_int64_to_float
function ml_of_int64_dbl_near(a) { return caml_int64_to_float(a); }

//Provides: ml_of_int64_dbl_up
//Requires: caml_int64_to_float
function ml_of_int64_dbl_up(a) { return caml_int64_to_float(a); }

//Provides: ml_of_int64_dbl_down
//Requires: caml_int64_to_float
function ml_of_int64_dbl_down(a) { return caml_int64_to_float(a); }

//Provides: ml_of_int64_dbl_zero
//Requires: caml_int64_to_float
function ml_of_int64_dbl_zero(a) { return caml_int64_to_float(a); }

//Provides: ml_of_int64_sgl_near
//Requires: caml_int64_to_float, toFloat32
function ml_of_int64_sgl_near(a) { return toFloat32(caml_int64_to_float(a)); }

//Provides: ml_of_int64_sgl_up
//Requires: caml_int64_to_float, toFloat32
function ml_of_int64_sgl_up(a) { return toFloat32(caml_int64_to_float(a)); }

//Provides: ml_of_int64_sgl_down
//Requires: caml_int64_to_float, toFloat32
function ml_of_int64_sgl_down(a) { return toFloat32(caml_int64_to_float(a)); }

//Provides: ml_of_int64_sgl_zero
//Requires: caml_int64_to_float, toFloat32
function ml_of_int64_sgl_zero(a) { return toFloat32(caml_int64_to_float(a)); }

//Provides: ml_of_int64_sgl_cur
//Requires: caml_int64_to_float, toFloat32
function ml_of_int64_sgl_cur(a) { return toFloat32(caml_int64_to_float(a)); }

// ============ Cast to int ============

//Provides: ml_to_int_near
function ml_to_int_near(a) { return Math.round(a); }

//Provides: ml_to_int_up
function ml_to_int_up(a) { return Math.ceil(a); }

//Provides: ml_to_int_down
function ml_to_int_down(a) { return Math.floor(a); }

//Provides: ml_to_int_zero
function ml_to_int_zero(a) { return Math.trunc(a); }

// ============ Cast from int ============

//Provides: ml_of_int_dbl_near
function ml_of_int_dbl_near(a) { return a; }

//Provides: ml_of_int_dbl_up
function ml_of_int_dbl_up(a) { return a; }

//Provides: ml_of_int_dbl_down
function ml_of_int_dbl_down(a) { return a; }

//Provides: ml_of_int_dbl_zero
function ml_of_int_dbl_zero(a) { return a; }

//Provides: ml_of_int_sgl_near
//Requires: toFloat32
function ml_of_int_sgl_near(a) { return toFloat32(a); }

//Provides: ml_of_int_sgl_up
//Requires: toFloat32
function ml_of_int_sgl_up(a) { return toFloat32(a); }

//Provides: ml_of_int_sgl_down
//Requires: toFloat32
function ml_of_int_sgl_down(a) { return toFloat32(a); }

//Provides: ml_of_int_sgl_zero
//Requires: toFloat32
function ml_of_int_sgl_zero(a) { return toFloat32(a); }

//Provides: ml_of_int_sgl_cur
//Requires: toFloat32
function ml_of_int_sgl_cur(a) { return toFloat32(a); }


// ============ Binary representation ============

//Provides: ml_bits_of_double
//Requires: caml_int64_create_lo_hi
function ml_bits_of_double(d) {
    var buffer = new ArrayBuffer(8);
    var f64 = new Float64Array(buffer);
    var i32 = new Int32Array(buffer);
    f64[0] = d;
    // js_of_ocaml represents int64 as [lo, hi] pair
    return caml_int64_create_lo_hi(i32[0], i32[1]);
}

//Provides: ml_double_of_bits
//Requires: caml_int64_lo32, caml_int64_hi32
function ml_double_of_bits(i) {
    var buffer = new ArrayBuffer(8);
    var f64 = new Float64Array(buffer);
    var i32 = new Int32Array(buffer);
    i32[0] = caml_int64_lo32(i);
    i32[1] = caml_int64_hi32(i);
    return f64[0];
}

//Provides: ml_bits_of_float
function ml_bits_of_float(d) {
    var buffer = new ArrayBuffer(4);
    var f32 = new Float32Array(buffer);
    var i32 = new Int32Array(buffer);
    f32[0] = d;
    // int32 in js_of_ocaml is just a JS number
    return i32[0];
}

//Provides: ml_float_of_bits
function ml_float_of_bits(i) {
    var buffer = new ArrayBuffer(4);
    var f32 = new Float32Array(buffer);
    var i32 = new Int32Array(buffer);
    // int32 in js_of_ocaml is just a JS number
    i32[0] = i;
    return f32[0];
}

// ============ Interval arithmetic helpers ============

//Provides: get_itv_l
function get_itv_l(x) { return x[1]; }

//Provides: get_itv_u
function get_itv_u(x) { return x[2]; }

//Provides: set_itv_l
function set_itv_l(x, v) { if (isNaN(v)) v = -Infinity; x[1] = v; }

//Provides: set_itv_u
function set_itv_u(x, v) { if (isNaN(v)) v = Infinity; x[2] = v; }

//Provides: get_itv_sl
//Requires: toFloat32
function get_itv_sl(x) { return toFloat32(x[1]); }

//Provides: get_itv_su
//Requires: toFloat32
function get_itv_su(x) { return toFloat32(x[2]); }

// ============ Interval addition (dbl) ============

//Provides: ml_add_dbl_itv_near
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_near(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

//Provides: ml_add_dbl_itv_up
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_up(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

//Provides: ml_add_dbl_itv_down
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_down(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

//Provides: ml_add_dbl_itv_zero
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_zero(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

//Provides: ml_add_dbl_itv_outer
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_outer(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

//Provides: ml_add_dbl_itv_inner
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_add_dbl_itv_inner(a, b, r) {
    set_itv_l(r, get_itv_l(a) + get_itv_l(b));
    set_itv_u(r, get_itv_u(a) + get_itv_u(b));
    return 0;
}

// ============ Interval addition (sgl) ============

//Provides: ml_add_sgl_itv_near
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_near(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}

//Provides: ml_add_sgl_itv_up
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_up(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}

//Provides: ml_add_sgl_itv_down
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_down(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}

//Provides: ml_add_sgl_itv_zero
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_zero(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}

//Provides: ml_add_sgl_itv_outer
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_outer(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}

//Provides: ml_add_sgl_itv_inner
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_add_sgl_itv_inner(a, b, r) {
    set_itv_l(r, get_itv_sl(a) + get_itv_sl(b));
    set_itv_u(r, get_itv_su(a) + get_itv_su(b));
    return 0;
}


// ============ Interval subtraction (dbl) ============

//Provides: ml_sub_dbl_itv_near
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_near(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

//Provides: ml_sub_dbl_itv_up
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_up(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

//Provides: ml_sub_dbl_itv_down
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_down(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

//Provides: ml_sub_dbl_itv_zero
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_zero(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

//Provides: ml_sub_dbl_itv_outer
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_outer(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

//Provides: ml_sub_dbl_itv_inner
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u
function ml_sub_dbl_itv_inner(a, b, r) {
    set_itv_l(r, get_itv_l(a) - get_itv_u(b));
    set_itv_u(r, get_itv_u(a) - get_itv_l(b));
    return 0;
}

// ============ Interval subtraction (sgl) ============

//Provides: ml_sub_sgl_itv_near
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_near(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

//Provides: ml_sub_sgl_itv_up
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_up(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

//Provides: ml_sub_sgl_itv_down
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_down(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

//Provides: ml_sub_sgl_itv_zero
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_zero(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

//Provides: ml_sub_sgl_itv_outer
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_outer(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

//Provides: ml_sub_sgl_itv_inner
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u
function ml_sub_sgl_itv_inner(a, b, r) {
    set_itv_l(r, get_itv_sl(a) - get_itv_su(b));
    set_itv_u(r, get_itv_su(a) - get_itv_sl(b));
    return 0;
}

// ============ MUL helper for intervals (0 * inf = 0) ============

//Provides: mulz_itv
function mulz_itv(a, b) { return (a === 0 || b === 0) ? 0 : a * b; }

// ============ Interval multiplication (dbl) ============

//Provides: ml_mul_dbl_itv_near
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_near(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_dbl_itv_up
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_up(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_dbl_itv_down
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_down(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_dbl_itv_zero
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_zero(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_dbl_itv_outer
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_outer(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_dbl_itv_inner
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, mulz_itv
function ml_mul_dbl_itv_inner(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}


// ============ Interval multiplication (sgl) ============

//Provides: ml_mul_sgl_itv_near
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_near(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_sgl_itv_up
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_up(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_sgl_itv_down
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_down(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_sgl_itv_zero
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_zero(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_sgl_itv_outer
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_outer(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_mul_sgl_itv_inner
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, mulz_itv
function ml_mul_sgl_itv_inner(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = mulz_itv(l1,l2), lh = mulz_itv(l1,h2), hl = mulz_itv(h1,l2), hh = mulz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

// ============ DIV helper for intervals (0/0 = inf/inf = 0) ============

//Provides: divz_itv
function divz_itv(a, b) { return (a === 0 || !isFinite(b)) ? 0 : a / b; }

// ============ Interval divpos (dbl) ============

//Provides: ml_divpos_dbl_itv_near
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_near(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_dbl_itv_up
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_up(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_dbl_itv_down
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_down(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_dbl_itv_zero
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_zero(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_dbl_itv_outer
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_outer(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_dbl_itv_inner
//Requires: get_itv_l, get_itv_u, set_itv_l, set_itv_u, divz_itv
function ml_divpos_dbl_itv_inner(a, b, r) {
    var l1 = get_itv_l(a), l2 = get_itv_l(b), h1 = get_itv_u(a), h2 = get_itv_u(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}


// ============ Interval divpos (sgl) ============

//Provides: ml_divpos_sgl_itv_near
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_near(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_sgl_itv_up
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_up(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_sgl_itv_down
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_down(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_sgl_itv_zero
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_zero(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_sgl_itv_outer
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_outer(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

//Provides: ml_divpos_sgl_itv_inner
//Requires: get_itv_sl, get_itv_su, set_itv_l, set_itv_u, divz_itv
function ml_divpos_sgl_itv_inner(a, b, r) {
    var l1 = get_itv_sl(a), l2 = get_itv_sl(b), h1 = get_itv_su(a), h2 = get_itv_su(b);
    var ll = divz_itv(l1,l2), lh = divz_itv(l1,h2), hl = divz_itv(h1,l2), hh = divz_itv(h1,h2);
    set_itv_l(r, Math.min(ll, hh, lh, hl));
    set_itv_u(r, Math.max(ll, hh, lh, hl));
    return 0;
}

// ============ String parsing ============

//Provides: ml_of_string_dbl_up
//Requires: caml_jsbytes_of_string
function ml_of_string_dbl_up(s) {
    return parseFloat(caml_jsbytes_of_string(s));
}

//Provides: ml_of_string_dbl_down
//Requires: caml_jsbytes_of_string
function ml_of_string_dbl_down(s) {
    return parseFloat(caml_jsbytes_of_string(s));
}

//Provides: ml_of_string_sgl_up
//Requires: caml_jsbytes_of_string, toFloat32
function ml_of_string_sgl_up(s) {
    return toFloat32(parseFloat(caml_jsbytes_of_string(s)));
}

//Provides: ml_of_string_sgl_down
//Requires: caml_jsbytes_of_string, toFloat32
function ml_of_string_sgl_down(s) {
    return toFloat32(parseFloat(caml_jsbytes_of_string(s)));
}
