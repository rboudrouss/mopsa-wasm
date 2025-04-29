# ocaml version: 4.12.0 needed
# this was done with emscripten 4.0.5 but version >= 4 should work
# You also need to install mopsa-analyzer dependencies, if not 
# already installed, run: `opam install --deps-only .` inside the mopsa-analyzer-js directory


log() {
  echo -e "\n\033[1;32m$1\033[0m\n"
}

log "Building mopsa in wasm"
log "Make sure you have emscripten installed and in your path"


log "\nclearing build directory\n"
rm -f build/*

# Building ocamlrun in wasm (emscripten must be installed)

log "Building ocamlrun in wasm"

cd ocaml-wasm

make clean

CFLAGS="-fPIC -g0" emconfigure ./configure

emmake make -C runtime


### Compiling dllcamlstr.so & libcamlstr.so

log "Building dllcamlstr.so & libcamlstr.so"

cd otherlibs/str

mkdir -p .dep

emcc -MM -D_FILE_OFFSET_BITS=64 -D_REENTRANT -DCAML_NAME_SPACE  -I../../runtime   strstubs.c -MT 'strstubs.o' -MF .dep/strstubs.d
emcc -c -fno-strict-aliasing -fwrapv -Wall -Wdeclaration-after-statement -fno-common -fexcess-precision=standard -fno-tree-vrp -ffunction-sections -g -fPIC -D_FILE_OFFSET_BITS=64 -D_REENTRANT -DCAML_NAME_SPACE  -I../../runtime -o strstubs.o strstubs.c

emcc -shared -s SIDE_MODULE=1 -o ./dllcamlstr.so strstubs.o 
emar rcs ./libcamlstr.a  strstubs.o && emranlib ./libcamlstr.a

cd ../..

### Compiling dllunix.so & libunix.a

log "Building dllunix.so & libunix.a"

cd otherlibs/unix

# make will fail it's normal
emmake make

emcc -s SIDE_MODULE=1 -shared  -o ./dllunix.so accept.o access.o addrofstr.o alarm.o bind.o channels.o chdir.o chmod.o chown.o chroot.o close.o fsync.o closedir.o connect.o cst2constr.o cstringv.o dup.o dup2.o envir.o errmsg.o execv.o execve.o execvp.o exit.o fchmod.o fchown.o fcntl.o fork.o ftruncate.o getaddrinfo.o getcwd.o getegid.o geteuid.o getgid.o getgr.o getgroups.o gethost.o gethostname.o getlogin.o getnameinfo.o getpeername.o getpid.o getppid.o getproto.o getpw.o gettimeofday.o getserv.o getsockname.o getuid.o gmtime.o initgroups.o isatty.o itimer.o kill.o link.o listen.o lockf.o lseek.o mkdir.o mkfifo.o mmap.o mmap_ba.o nice.o open.o opendir.o pipe.o putenv.o read.o readdir.o readlink.o rename.o rewinddir.o rmdir.o select.o sendrecv.o setgid.o setgroups.o setsid.o setuid.o shutdown.o signals.o sleep.o socket.o socketaddr.o socketpair.o sockopt.o spawn.o stat.o strofaddr.o symlink.o termios.o time.o times.o truncate.o umask.o unixsupport.o unlink.o utimes.o wait.o write.o -lm
emar rcs ./libunix.a  accept.o access.o addrofstr.o alarm.o bind.o channels.o chdir.o chmod.o chown.o chroot.o close.o fsync.o closedir.o connect.o cst2constr.o cstringv.o dup.o dup2.o envir.o errmsg.o execv.o execve.o execvp.o exit.o fchmod.o fchown.o fcntl.o fork.o ftruncate.o getaddrinfo.o getcwd.o getegid.o geteuid.o getgid.o getgr.o getgroups.o gethost.o gethostname.o getlogin.o getnameinfo.o getpeername.o getpid.o getppid.o getproto.o getpw.o gettimeofday.o getserv.o getsockname.o getuid.o gmtime.o initgroups.o isatty.o itimer.o kill.o link.o listen.o lockf.o lseek.o mkdir.o mkfifo.o mmap.o mmap_ba.o nice.o open.o opendir.o pipe.o putenv.o read.o readdir.o readlink.o rename.o rewinddir.o rmdir.o select.o sendrecv.o setgid.o setgroups.o setsid.o setuid.o shutdown.o signals.o sleep.o socket.o socketaddr.o socketpair.o sockopt.o spawn.o stat.o strofaddr.o symlink.o termios.o time.o times.o truncate.o umask.o unixsupport.o unlink.o utimes.o wait.o write.o && emranlib ./libunix.a

cd ../../..

# Building GMP

cd gmp-6.3.0

emconfigure ./configure --enable-cxx --enable-shared

emconfigure ./configure \
  --host=none \
  --disable-assembly \
  --enable-cxx \
  --enable-shared \
  --prefix=./build



# Building Apron

cd apron

emconfigure ./configure -no-cxx -no-java -no-ocaml -no-ppl -no-pplite

cd ..

# Building mopsa to bytecode

log "Building mopsa to bytecode"

cd mopsa-analyzer-js

make clean

./configure

make all

cd ..

# Building website

log "Assembling website"

mkdir -p build 


# build libitvUtils_stubs

log "Building libitvUtils_stubs"

emcc -c -s SIDE_MODULE=1 -fno-strict-aliasing -fwrapv -fPIC -D_FILE_OFFSET_BITS=64 -D_REENTRANT -fdiagnostics-color=always -I ~/.opam/4.12.0/lib/ocaml -I ~/.opam/4.12.0/lib/zarith -I mopsa-analyser-js/_build/default/utils/core -o build/floats_round.o mopsa-analyzer-js/utils/itvUtils/floats_round.c
emcc -shared -s SIDE_MODULE=1 -o build/libitvUtils_stubs.so build/floats_round.o -lm
emar rcs build/libitvUtils_stubs.a build/floats_round.o && emranlib build/libitvUtils_stubs.a

# build libmopsa_c_parser_stubs

log "Building libmopsa_c_parser_stubs"

cp -r /usr/include/llvm/ includes/llvm/
cp -r /usr/include/clang/ includes/clang/
cp -r /usr/include/llvm-c/ includes/llvm-c/

emcc -c -s SIDE_MODULE=1 -x c++ -fno-strict-aliasing -fwrapv -fPIC -fdiagnostics-color=always -I ~/.opam/4.12.0/lib/ocaml -Wno-strict-aliasing -Wall -Wno-comment -std=c++17 -fno-exceptions -D_GNU_SOURCE -D__STDC_CONSTANT_MACROS -D__STDC_FORMAT_MACROS -D__STDC_LIMIT_MACROS '-DCLANGRESOURCE="/usr/lib/clang/19"' -g -I ~/.opam/4.12.0/lib/ocaml -I ~/.opam/4.12.0/lib/zarith -I ./includes -o build/Clang_to_ml.o mopsa-analyzer-js/parsers/c/lib/parser/Clang_to_ml.cc

emcc -shared -s SIDE_MODULE=1 -o build/libmopsa_c_parser_stubs build/Clang_to_ml.o -L/usr/lib  -lclang-cpp -lclang -lstdc++ -lLLVM-19
# we need libclang-cpp.so libclang.so libLLVM-19.so yeah clang compiling time

# Rebuilding mopsa.bc with including the stubs
log "Rebuilding mopsa.bc with including the stubs"

cd mopsa-analyzer-js/_build/default

rm -f analyzer/mopsa.bc

ocamlc.opt -custom -w -40 -g -o analyzer/mopsa.bc ~/.opam/4.12.0/lib/ocaml/str.cma ~/.opam/4.12.0/lib/ocaml/unix.cma utils/core/utils_core.cma ~/.opam/4.12.0/lib/zarith/zarith.cma utils/containers/containers.cma utils/itvUtils/itvUtils.cma -I utils/itvUtils utils/congUtils/congUtils.cma utils/bitfields/bitfields.cma utils/mopsa_utils.cma analyzer/framework/core/ast/ast.cma ~/.opam/4.12.0/lib/yojson/yojson.cma analyzer/framework/core/core.cma analyzer/framework/combiners/common/combiners_common.cma analyzer/framework/sig/abstraction/abstraction.cma analyzer/framework/sig/combiner/combiner.cma analyzer/framework/sig/reduction/reduction.cma analyzer/framework/sig/sig.cma analyzer/framework/lattices/lattices.cma analyzer/framework/combiners/value/value.cma analyzer/framework/combiners/domain/domain.cma analyzer/framework/combiners/combiners.cma analyzer/framework/params/config/config.cma analyzer/framework/output/output.cma analyzer/framework/params/params.cma ~/.opam/4.12.0/lib/bigarray-compat/bigarray_compat.cma ~/.opam/4.12.0/lib/gmp/gmp.cma ~/.opam/4.12.0/lib/apron/apron.cma analyzer/framework/toplevel/toplevel.cma analyzer/framework/engines/interactive/interactive.cma analyzer/framework/engines/engines.cma analyzer/framework/framework.cma analyzer/mopsa/mopsa.cma parsers/universal/mopsa_universal_parser.cma analyzer/languages/universal/lang/lang.cma analyzer/languages/universal/heap/heap.cma analyzer/languages/universal/numeric/common/numeric_common.cma analyzer/languages/universal/numeric/values/intervals/intervals.cma analyzer/languages/universal/numeric/values/powersets/powersets.cma analyzer/languages/universal/numeric/values/numeric_values.cma ~/.opam/4.12.0/lib/apron/boxMPQ.cma ~/.opam/4.12.0/lib/apron/octMPQ.cma ~/.opam/4.12.0/lib/apron/polkaMPQ.cma analyzer/languages/universal/numeric/relational/relational.cma analyzer/languages/universal/numeric/reductions/numeric_reductions.cma analyzer/languages/universal/numeric/universal_numeric.cma analyzer/languages/universal/hooks/hooks.cma analyzer/languages/universal/iterators/interproc/universal_interproc.cma analyzer/languages/universal/iterators/universal_iterators.cma analyzer/languages/universal/packing/universal_packing.cma analyzer/languages/universal/strings/universal_strings.cma analyzer/languages/universal/toy/universal_toy.cma analyzer/languages/universal/partitioning/universal_partitioning.cma analyzer/languages/universal/universal.cma parsers/c/lib/parser/mopsa_c_parser.cma -I parsers/c/lib/parser parsers/c_stubs/parsing/parsing.cma parsers/c_stubs/passes/passes.cma parsers/c_stubs/mopsa_c_stubs_parser.cma analyzer/languages/stubs/stubs.cma analyzer/languages/cfg/cfg.cma analyzer/languages/repl/repl.cma parsers/c/lib/db/mopsa_build_db.cma analyzer/languages/c/lang/c_lang.cma analyzer/languages/c/common/c_common.cma analyzer/languages/c/cstubs/cstubs.cma analyzer/languages/c/hooks/c_hooks.cma analyzer/languages/c/iterators/c_iterators.cma analyzer/languages/c/libs/libc/file_descriptor/file_descriptor.cma analyzer/languages/c/libs/libc/formatted_io/formatted_io.cma analyzer/languages/c/libs/libc/libc.cma analyzer/languages/c/libs/c_libs.cma analyzer/languages/c/memory/cells/cells.cma analyzer/languages/c/memory/pointers/pointers.cma analyzer/languages/c/memory/c_memory.cma analyzer/languages/c/packing/c_packing.cma analyzer/languages/c/c.cma parsers/python/mopsa_py_parser.cma analyzer/languages/python/lang/python_lang.cma analyzer/languages/python/hooks/python_hooks.cma analyzer/languages/python/common/python_common.cma analyzer/languages/python/data_model/data_model.cma analyzer/languages/python/objects/python_objects.cma analyzer/languages/python/desugar/desugar.cma analyzer/languages/python/types/types.cma analyzer/languages/python/flows/python_flows.cma analyzer/languages/python/libs/python_libs.cma analyzer/languages/python/packing/python_packing.cma analyzer/languages/python/python.cma analyzer/languages/cpython/cpython.cma analyzer/mopsa_analyzer.cma analyzer/.mopsa.eobjs/byte/dune__exe__Mopsa.cmo -linkall -cclib -L../../../build -cclib -lcamlstr.a -cclib -lunix -cclib -litvUtils_stubs.a

cd ../../..

cp mopsa-analyzer-js/_build/default/analyzer/mopsa.bc build/

# building final wasm
log "Building final wasm"

cp ocaml-wasm/otherlibs/unix/libunix.a build/
cp ocaml-wasm/otherlibs/unix/dllunix.so build/
cp ocaml-wasm/otherlibs/str/dllcamlstr.so build/
cp ocaml-wasm/otherlibs/str/libcamlstr.a build/


emcc -o build/ocamlrun.html ocaml-wasm/runtime/prims.o ocaml-wasm/runtime/libcamlrun.a \
  build/libitvUtils_stubs.a build/libcamlstr.a \
  -s WASM=1  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'run','callMain']" \
  -s MAIN_MODULE=1 -s NO_EXIT_RUNTIME=1 \
  -s FORCE_FILESYSTEM=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  -s ENVIRONMENT='web'  --preload-file build/mopsa.bc \
  --pre-js prejs.js
#  -s EXPORTED_FUNCTIONS="['_malloc','_free','_dlopen','_dlsym','_dlclose','_main']" \
# -lpthreads

