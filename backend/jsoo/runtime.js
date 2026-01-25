/**
 * MOPSA js_of_ocaml Runtime
 *
 * This file provides JavaScript runtime support for the MOPSA js_of_ocaml worker.
 * It is linked into the generated JavaScript file by dune.
 */

// Virtual filesystem for file operations
// js_of_ocaml provides a basic filesystem, but we may need to extend it

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
function mlclang_get_target_info() { return 0; }

//Provides: mlclang_get_default_target_options
function mlclang_get_default_target_options() { return 0; }

//Provides: exit
function exit() { return 0; }