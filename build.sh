rm -f build/*

# Building ocamlrun in wasm (emscripten must be installed)

cd ocaml-wasm

make clean

CFLAGS="-fPIC -g0" emconfigure ./configure

cd runtime

emmake make

cd ../..

# Building mopsa to bytecode (ocaml == 4.12.0)

cd mopsa-analyzer-js

if [ "$1" = "-i" ]; then # install only if given -i
  opam install --deps-only .
fi

make clean

./configure

make all

cd ..

# Building website

mkdir -p build 

cp mopsa-analyzer-js/_build/default/analyzer/mopsa.bc build/
cp mopsa-analyzer-js/_build/default/parsers/c/lib/parser/libmopsa_c_parser_stubs.a build/
cp mopsa-analyzer-js/_build/default/utils/itvUtils/libitvUtils_stubs.a build/
#cp mopsa-analyzer-js/_build/default/temp/mopsaJs.bc build/

gcc -c -o build/floats_round.o mopsa-analyzer-js/utils/itvUtils/floats_round.c -I $(ocamlc -where)
ocamlc -c -o build/floats_round.cmo wrappers/floats_round.ml
ocamlc -o build/floats_round.bc build/floats_round.o build/floats_round.cmo

emcc -o build/ocamlrun.html ocaml-wasm/runtime/prims.o ocaml-wasm/runtime/libcamlrun.a libs/dllcamlstr.wasm \
  -s WASM=1  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'run','callMain']" \
  -s MAIN_MODULE=1 -s NO_EXIT_RUNTIME=1 \
  -s FORCE_FILESYSTEM=1 -s SINGLE_FILE=1 -s WASM_ASYNC_COMPILATION=0\
  -s ENVIRONMENT='web'  --preload-file build/mopsa.bc \
  --pre-js prejs.js
  # --preload-file build/dllmopsa_c_parser_stubs.so@lib/dllmopsa_c_parser_stubs.so \
  # --preload-file build/dllitvUtils_stubs.so@lib/dllitvUtils_stubs.so \
#  -L./build -l:libmopsa_c_parser_stubs.a -l:libitvUtils_stubs.a \
  #--preload-file build/floats_round.bc \
#  -s EXPORTED_FUNCTIONS="['_malloc','_free','_dlopen','_dlsym','_dlclose','_main']" \
# -lpthreads

