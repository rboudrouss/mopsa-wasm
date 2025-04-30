# <!> NOT WORKING !!! please refer to build.sh for now
# Makefile for MOPSA WebAssembly build
# Requires OCaml 4.12.0 and Emscripten >= 4.0


# Directories
BUILD_DIR = build
INSTALL_DIR = libs
LIBS_DIR = $(INSTALL_DIR)/lib
INCLUDES_DIR = $(INSTALL_DIR)/include

TEMP_INCLUDES_DIR = includes

# Tools and flags
EMCC = emcc
EMAR = emar
EMRANLIB = emranlib
EMCONFIGURE = emconfigure
EMMAKE = emmake

# Common flags
EMCC_FLAGS = -fno-strict-aliasing -fwrapv -fPIC -D_FILE_OFFSET_BITS=64 -D_REENTRANT
SIDE_MODULE_FLAGS = -s SIDE_MODULE=1

# Paths
OPAM_PATH = ~/.opam/4.12.0
OCAML_INCLUDE = -I $(OPAM_PATH)/lib/ocaml
ZARITH_INCLUDE = -I $(OPAM_PATH)/lib/zarith

.PHONY: all clean

all: $(BUILD_DIR)/ocamlrun.html

# Clean build directory
clean:
	rm -rf $(BUILD_DIR)/*
	cd ocaml-wasm && make clean
	cd mopsa-analyzer-js && make clean
	cd mpfr-4.2.2 && make clean
	cd gmp-6.1.2 && make clean

# Create build directory
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# OCaml runtime in WASM
$(BUILD_DIR)/prims.o $(LIBS_DIR)/libcamlrun.a: $(BUILD_DIR)
	cd ocaml-wasm && \
	CFLAGS="-fPIC -g0" $(EMCONFIGURE) ./configure && \
	$(EMMAKE) make -C runtime
	cp ocaml-wasm/runtime/libcamlrun.a $(LIBS_DIR)
	cp ocaml-wasm/runtime/prims.o $(BUILD_DIR)

# GMP build
gmp-build: $(BUILD_DIR)
	cd gmp-6.1.2 && \
	$(EMCONFIGURE) ./configure --disable-assembly --host none --enable-cxx --prefix=$(CURDIR)/$(INSTALL_DIR) && \
	make && \
	make install

# MPFR build
mpfr-build: gmp-build
	cd mpfr-4.2.2 && \
	$(EMCONFIGURE) ./configure --host none --with-gmp=$(CURDIR)/$(LIBS_DIR) --prefix=$(CURDIR)/$(LIBS_DIR) && \
	make && \
	make install

# Apron build
apron-build: mpfr-build
	cd apron && \
	MPFR_PREFIX=$(CURDIR)/$(LIBS_DIR) GMP_PREFIX=$(CURDIR)/$(LIBS_DIR) \
	$(EMCONFIGURE) ./configure -no-java -no-cxx -no-ppl -no-pplite -prefix $(CURDIR)/$(LIBS_DIR) && \
	make -i && \
	make install -i && \
	cp $(OPAM_PATH)/lib/apron/* $(LIBS_DIR)/lib/

# LLVM/Clang includes setup
$(INCLUDES_DIR):
	mkdir -p $(INCLUDES_DIR)
	cp -r /usr/include/llvm/ $(INCLUDES_DIR)/llvm/
	cp -r /usr/include/clang/ $(INCLUDES_DIR)/clang/
	cp -r /usr/include/llvm-c/ $(INCLUDES_DIR)/llvm-c/

# ITV Utils stubs
$(BUILD_DIR)/libitvUtils_stubs.so: ocaml-wasm-build | $(BUILD_DIR)
	$(EMCC) -c $(SIDE_MODULE_FLAGS) $(EMCC_FLAGS) $(OCAML_INCLUDE) $(ZARITH_INCLUDE) \
		-I mopsa-analyser-js/_build/default/utils/core \
		-o $(BUILD_DIR)/floats_round.o \
		mopsa-analyzer-js/utils/itvUtils/floats_round.c
	$(EMCC) -shared $(SIDE_MODULE_FLAGS) -o $@ $(BUILD_DIR)/floats_round.o -lm
	$(EMAR) rcs $(BUILD_DIR)/libitvUtils_stubs.a $(BUILD_DIR)/floats_round.o
	$(EMRANLIB) $(BUILD_DIR)/libitvUtils_stubs.a

# C Parser stubs
$(BUILD_DIR)/libmopsa_c_parser_stubs: $(INCLUDES_DIR) ocaml-wasm-build | $(BUILD_DIR)
	$(EMCC) -c $(SIDE_MODULE_FLAGS) -x c++ $(EMCC_FLAGS) $(OCAML_INCLUDE) \
		-Wno-strict-aliasing -Wall -Wno-comment -std=c++17 -fno-exceptions \
		-D_GNU_SOURCE -D__STDC_CONSTANT_MACROS -D__STDC_FORMAT_MACROS -D__STDC_LIMIT_MACROS \
		'-DCLANGRESOURCE="/usr/lib/clang/19"' -g \
		$(ZARITH_INCLUDE) -I ./$(INCLUDES_DIR) \
		-o $(BUILD_DIR)/Clang_to_ml.o \
		mopsa-analyzer-js/parsers/c/lib/parser/Clang_to_ml.cc
	$(EMCC) -shared $(SIDE_MODULE_FLAGS) -o $@ $(BUILD_DIR)/Clang_to_ml.o \
		-L/usr/lib -lclang-cpp -lclang -lstdc++ -lLLVM-19

# MOPSA bytecode
$(BUILD_DIR)/mopsa.bc: $(BUILD_DIR)/libitvUtils_stubs.so $(BUILD_DIR)/libmopsa_c_parser_stubs apron-build
	cp ocaml-wasm/runtime/libcamlrun.a $(BUILD_DIR)/
	cd mopsa-analyzer-js/_build/default && \
	ocamlc.opt -linkall -ccopt -L../../../$(LIBS_DIR)/lib -ccopt -I../../../$(LIBS_DIR)/include \
		-ccopt -lcamlstr -ccopt -lunix -ccopt -litvUtils_stubs -custom -w -40 -g \
		-o analyzer/mopsa.bc \
		$(shell ls $(OPAM_PATH)/lib/ocaml/str.cma) \
		$(shell ls $(OPAM_PATH)/lib/ocaml/unix.cma) \
		utils/core/utils_core.cma \
		$(shell ls $(OPAM_PATH)/lib/zarith/zarith.cma) \
		utils/containers/containers.cma \
		utils/itvUtils/itvUtils.cma \
		-I utils/itvUtils \
		utils/congUtils/congUtils.cma \
		utils/bitfields/bitfields.cma \
		utils/mopsa_utils.cma \
		analyzer/framework/core/ast/ast.cma \
		$(shell ls $(OPAM_PATH)/lib/yojson/yojson.cma) \
		analyzer/framework/core/core.cma \
		analyzer/framework/combiners/common/combiners_common.cma \
		analyzer/framework/sig/abstraction/abstraction.cma \
		analyzer/framework/sig/combiner/combiner.cma \
		analyzer/framework/sig/reduction/reduction.cma \
		analyzer/framework/sig/sig.cma \
		analyzer/framework/lattices/lattices.cma \
		analyzer/framework/combiners/value/value.cma \
		analyzer/framework/combiners/domain/domain.cma \
		analyzer/framework/combiners/combiners.cma \
		analyzer/framework/params/config/config.cma \
		analyzer/framework/output/output.cma \
		analyzer/framework/params/params.cma \
		$(shell ls $(OPAM_PATH)/lib/bigarray-compat/bigarray_compat.cma) \
		$(shell ls $(OPAM_PATH)/lib/gmp/gmp.cma) \
		$(shell ls $(OPAM_PATH)/lib/apron/apron.cma) \
		analyzer/framework/toplevel/toplevel.cma \
		analyzer/framework/engines/interactive/interactive.cma \
		analyzer/framework/engines/engines.cma \
		analyzer/framework/framework.cma \
		analyzer/mopsa/mopsa.cma \
		parsers/universal/mopsa_universal_parser.cma \
		analyzer/languages/universal/lang/lang.cma \
		analyzer/languages/universal/heap/heap.cma \
		analyzer/languages/universal/numeric/common/numeric_common.cma \
		analyzer/languages/universal/numeric/values/intervals/intervals.cma \
		analyzer/languages/universal/numeric/values/powersets/powersets.cma \
		analyzer/languages/universal/numeric/values/numeric_values.cma \
		$(shell ls $(OPAM_PATH)/lib/apron/boxMPQ.cma) \
		$(shell ls $(OPAM_PATH)/lib/apron/octMPQ.cma) \
		$(shell ls $(OPAM_PATH)/lib/apron/polkaMPQ.cma) \
		analyzer/languages/universal/numeric/relational/relational.cma \
		analyzer/languages/universal/numeric/reductions/numeric_reductions.cma \
		analyzer/languages/universal/numeric/universal_numeric.cma \
		analyzer/languages/universal/hooks/hooks.cma \
		analyzer/languages/universal/iterators/interproc/universal_interproc.cma \
		analyzer/languages/universal/iterators/universal_iterators.cma \
		analyzer/languages/universal/packing/universal_packing.cma \
		analyzer/languages/universal/strings/universal_strings.cma \
		analyzer/languages/universal/toy/universal_toy.cma \
		analyzer/languages/universal/partitioning/universal_partitioning.cma \
		analyzer/languages/universal/universal.cma \
		parsers/c/lib/parser/mopsa_c_parser.cma \
		-I parsers/c/lib/parser \
		parsers/c_stubs/parsing/parsing.cma \
		parsers/c_stubs/passes/passes.cma \
		parsers/c_stubs/mopsa_c_stubs_parser.cma \
		analyzer/languages/stubs/stubs.cma \
		analyzer/languages/cfg/cfg.cma \
		analyzer/languages/repl/repl.cma \
		parsers/c/lib/db/mopsa_build_db.cma \
		analyzer/languages/c/lang/c_lang.cma \
		analyzer/languages/c/common/c_common.cma \
		analyzer/languages/c/cstubs/cstubs.cma \
		analyzer/languages/c/hooks/c_hooks.cma \
		analyzer/languages/c/iterators/c_iterators.cma \
		analyzer/languages/c/libs/libc/file_descriptor/file_descriptor.cma \
		analyzer/languages/c/libs/libc/formatted_io/formatted_io.cma \
		analyzer/languages/c/libs/libc/libc.cma \
		analyzer/languages/c/libs/c_libs.cma \
		analyzer/languages/c/memory/cells/cells.cma \
		analyzer/languages/c/memory/pointers/pointers.cma \
		analyzer/languages/c/memory/c_memory.cma \
		analyzer/languages/c/packing/c_packing.cma \
		analyzer/languages/c/c.cma \
		parsers/python/mopsa_py_parser.cma \
		analyzer/languages/python/lang/python_lang.cma \
		analyzer/languages/python/hooks/python_hooks.cma \
		analyzer/languages/python/common/python_common.cma \
		analyzer/languages/python/data_model/data_model.cma \
		analyzer/languages/python/objects/python_objects.cma \
		analyzer/languages/python/desugar/desugar.cma \
		analyzer/languages/python/types/types.cma \
		analyzer/languages/python/flows/python_flows.cma \
		analyzer/languages/python/libs/python_libs.cma \
		analyzer/languages/python/packing/python_packing.cma \
		analyzer/languages/python/python.cma \
		analyzer/languages/cpython/cpython.cma \
		analyzer/mopsa_analyzer.cma \
		analyzer/.mopsa.eobjs/byte/dune__exe__Mopsa.cmo && \
	cp analyzer/mopsa.bc ../../../$(BUILD_DIR)/

# Final WebAssembly build
$(BUILD_DIR)/ocamlrun.html: $(BUILD_DIR)/mopsa.bc
	cp ocaml-wasm/otherlibs/unix/libunix.a $(BUILD_DIR)/
	cp ocaml-wasm/otherlibs/unix/dllunix.so $(BUILD_DIR)/
	cp ocaml-wasm/otherlibs/str/dllcamlstr.so $(BUILD_DIR)/
	cp ocaml-wasm/otherlibs/str/libcamlstr.a $(BUILD_DIR)/
	$(EMCC) -o $@ ocaml-wasm/runtime/prims.o ocaml-wasm/runtime/libcamlrun.a \
		-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 \
		-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'run','callMain']" \
		-s MAIN_MODULE=1 -s NO_EXIT_RUNTIME=1 \
		-s FORCE_FILESYSTEM=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
		-s ENVIRONMENT='web' --preload-file $(BUILD_DIR)/mopsa.bc \
		--pre-js prejs.js

# Install dependencies
.PHONY: install-deps
install-deps:
	cd mopsa-analyzer-js && opam install --deps-only .