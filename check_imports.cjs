const fs = require('fs');
const needed = ['caml_invalid_argument', 'caml_alloc_small', 'caml_stat_alloc', 'caml_stat_free', 'caml_string_length', 'caml_alloc_custom', 'frexp', 'free', 'malloc', 'caml_copy_double', 'caml_copy_nativeint', 'caml_copy_string', '__assert_fail', 'caml_ba_alloc_dims', 'fflush', 'caml_failwith', 'caml_modify', 'caml_alloc', 'abort', 'caml_named_value', 'fprintf', 'caml_raise_with_arg', 'caml_serialize_int_8', 'caml_serialize_block_1', 'caml_deserialize_uint_8', 'caml_deserialize_block_1', 'caml_register_custom_operations', 'strcmp', 'strlen', 'strcpy', 'snprintf', 'caml_callback2', 'fiprintf', 'realloc', 'fputc', 'iprintf', 'putchar', 'puts', 'strncmp', 'fwrite', 'qsort', 'fputs', 'strdup', 'calloc', 'nextafterf', 'nextafter', 'ldexp', 'fmax', 'fmin', '__small_fprintf', '__fpclassifyl', 'ldexpl', 'floorl', 'sqrtl', 'nextafterl', 'fmaxl', 'truncl', 'fminl', 'ceill', 'bsearch', 'putc', 'getc', 'ungetc', 'feof', 'localeconv', 'sprintf', '__errno_location', 'strcat', 'printf', 'memcmp', 'strtol', 'fread', 'raise', 'nl_langinfo', 'ferror', 'strchr', 'isascii', 'isdigit', 'islower', 'vsnprintf', 'vsprintf', 'isxdigit', 'sscanf', '__fe_getround', '__fe_raise_inexact'];

const buf = fs.readFileSync('dist/ocamlrun.wasm');
const wasm = new WebAssembly.Module(buf);
const exportedFuncs = new Set(WebAssembly.Module.exports(wasm).filter(e => e.kind === 'function').map(e => e.name));

const missing = needed.filter(n => !exportedFuncs.has(n));
console.log('Missing from ocamlrun.wasm (' + missing.length + '):', JSON.stringify(missing, null, 2));

