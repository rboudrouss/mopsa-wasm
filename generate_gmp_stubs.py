#!/usr/bin/env python3
"""
Generate stub implementations for all mlgmpidl OCaml primitives
"""

import subprocess
import re

# Get all function names from the generated C files
def get_functions_from_file(filename):
    try:
        result = subprocess.run(
            ['grep', '^value camlidl', filename],
            capture_output=True,
            text=True
        )
        functions = []
        for line in result.stdout.strip().split('\n'):
            if line:
                # Extract function name
                match = re.match(r'value\s+(camlidl_\w+)', line)
                if match:
                    functions.append(match.group(1))
        return functions
    except:
        return []

# Collect all functions
all_functions = set()

files = [
    'mlgmpidl/mpz_caml.c',
    'mlgmpidl/mpq_caml.c',
    'mlgmpidl/mpf_caml.c',
    'mlgmpidl/mpfr_caml.c',
    'mlgmpidl/gmp_random_caml.c',
]

# Also get Apron functions
import glob
apron_files = glob.glob('apron/mlapronidl/*_caml.c')
apron_files.extend(glob.glob('apron/box/*_caml.c'))
apron_files.extend(glob.glob('apron/oct*/*_caml.c'))
apron_files.extend(glob.glob('apron/newpolka/*_caml.c'))
files.extend(apron_files)

for f in files:
    funcs = get_functions_from_file(f)
    all_functions.update(funcs)

# Try to extract function signatures from the C files
def get_function_arity(filename, func_name):
    """Try to determine the arity of a function from its C definition"""
    try:
        with open(filename, 'r') as f:
            content = f.read()
            # Look for the function definition
            import re
            # Match: value func_name(\n  value v1,\n  value v2, ...)
            pattern = rf'value\s+{re.escape(func_name)}\s*\((.*?)\)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                params = match.group(1)
                # Count 'value' keywords
                value_count = params.count('value')
                if value_count > 0:
                    return value_count
    except:
        pass
    return None

# Build a map of function names to their arities
func_arities = {}
for f in files:
    for func in all_functions:
        if func not in func_arities:
            arity = get_function_arity(f, func)
            if arity:
                func_arities[func] = arity

# Generate stub implementations
print("// Auto-generated OCaml primitive stubs for mlgmpidl and Apron")
print("#include <caml/mlvalues.h>")
print("#include <caml/fail.h>")
print()

for func in sorted(all_functions):
    arity = func_arities.get(func, 1)  # Default to 1 if unknown

    # Generate parameter list
    params = ', '.join([f'value v{i}' for i in range(1, arity + 1)])
    if not params:
        params = 'value unit'

    print(f"value {func}({params}) {{")
    print(f'    // Stub: GMP/MPFR/Apron not available in minimal MOPSA build')
    print(f"    return Val_unit;")
    print(f"}}")
    print()

