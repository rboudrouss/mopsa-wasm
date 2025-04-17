rm -f build/*

# Building ocamlrun in wasm (emscripten must be installed)

cd ocaml-wasm

emconfigure ./configure

cd runtime

emmake make

cd ../..

# Building mopsa to bytecode (ocaml >= 4.12)

cd mopsa-analyzer-js

if [ "$1" = "-i" ]; then # install only if given -i
  opam install --deps-only .
fi

./configure

make all

cd ..

# Building website

mkdir -p build 

cp mopsa-analyzer-js/_build/default/analyzer/mopsa.bc build/
cp mopsa-analyzer-js/_build/default/parsers/c/lib/parser/dllmopsa_c_parser_stubs.so build/
cp mopsa-analyzer-js/_build/default/utils/itvUtils/dllitvUtils_stubs.so build/
#cp mopsa-analyzer-js/_build/default/temp/mopsaJs.bc build/

emcc -o build/ocamlrun.html ocaml-wasm/runtime/prims.o ocaml-wasm/runtime/libcamlrun.a \
  -s WASM=1  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS=['_malloc','_free','_dlopen','_dlsym','_dlclose', '_main'] \
  -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'run']" \
  -s MAIN_MODULE=1 -s NO_EXIT_RUNTIME=1 \
  -s FORCE_FILESYSTEM=1 -s NODERAWFS=1 \
  -s ENVIRONMENT='web'  --preload-file build/mopsa.bc \
  --preload-file build/dllmopsa_c_parser_stubs.so \
  --preload-file build/dllitvUtils_stubs.so \
   --pre-js prejs.js 
# -lpthreads

