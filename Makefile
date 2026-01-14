# Makefile for MOPSA WebAssembly build
# Replaces build-wasm.sh with proper dependency management
#
# Prerequisites:
# - OCaml 4.12.0 or 4.13.x (opam switch 4.12.0)
# - Node.js >= 18
# - pnpm installed (npm install -g pnpm)
# - Emscripten SDK sourced (source emsdk_env.sh)
#
# Usage:
#   make              # Full build
#   make deps         # Build native dependencies (GMP, MPFR, Apron)
#   make ocaml        # Build OCaml bytecode only
#   make wasm         # Build WASM stubs only
#   make ts           # Build TypeScript only
#   make clean        # Clean build artifacts
#   make serve        # Start demo server

.PHONY: all clean deps ocaml wasm ts serve check-env help frontend frontend-deps clean-frontend share clang llvm-patch
.SILENT: check-env

# Directories
INSTALL_DIR := libs
LIBS_DIR := $(INSTALL_DIR)/lib
DIST_DIR := dist
BUILD_DIR := _build
LLVM_BUILD_DIR := llvm-project/build
LLVM_INSTALL_DIR := $(INSTALL_DIR)/llvm

# Tools
EMCC := emcc
EMCONFIGURE := emconfigure
EMMAKE := emmake
OPAM_EXEC := opam exec --
PNPM := pnpm

# OCaml paths
OCAML_STDLIB := $(shell ocamlc -where)

# Emscripten flags
EMCC_SIDE_MODULE := -s SIDE_MODULE=1 -fPIC

# Number of parallel jobs
NPROC := $(shell nproc 2>/dev/null || echo 4)

# Clang version (LLVM 8.0.1)
CLANG_VERSION := 8
CLANG_RESOURCE_DIR := $(LLVM_INSTALL_DIR)/lib/clang/$(CLANG_VERSION)

#==============================================================================
# Main targets
#==============================================================================

all: deps ocaml wasm ts frontend summary

help:
	@echo "MOPSA WASM Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all           - Build everything (default)"
	@echo "  deps          - Build native dependencies (GMP, MPFR, MLGMPIDL, Apron)"
	@echo "  ocaml         - Build OCaml bytecode"
	@echo "  wasm          - Build WASM stubs"
	@echo "  ts            - Build TypeScript worker"
	@echo "  frontend      - Build React frontend"
	@echo "  frontend-deps - Install frontend dependencies"
	@echo "  clean         - Clean build artifacts"
	@echo "  serve         - Start demo server on port 8080"

#==============================================================================
# Environment check (optional)
#==============================================================================

check-env:
	@echo "Checking environment..."
	@ocamlc -version
	@node -v
	@pnpm -v
	@emcc -v | head -1

#==============================================================================
# Native dependencies (GMP, MPFR, MLGMPIDL, Apron)
#==============================================================================

deps: $(LIBS_DIR)/dllgmp.wasm $(LIBS_DIR)/dllmpfr.wasm $(LIBS_DIR)/dllgmp_caml.wasm $(LIBS_DIR)/dllapron_caml.wasm $(LIBS_DIR)/dllboxMPQ_caml.wasm $(LIBS_DIR)/dlloctMPQ_caml.wasm $(LIBS_DIR)/dllpolkaMPQ_caml.wasm $(LIBS_DIR)/dllapron.wasm $(LLVM_INSTALL_DIR)/lib/libclangBasic.a $(LLVM_INSTALL_DIR)/lib/libLLVMCore.a

#==============================================================================
# LLVM/Clang libraries
#==============================================================================

# Convenience target for building Clang libraries
clang: $(LLVM_INSTALL_DIR)/lib/libclangBasic.a $(LLVM_INSTALL_DIR)/lib/libLLVMCore.a
	@echo "Clang/LLVM libraries built successfully"

# Build LLVM and Clang libraries for WebAssembly
# Two-stage build:
# 1. Apply patches for GCC 11 / Emscripten compatibility
# 2. Native build for llvm-tblgen and clang-tblgen
# 3. Cross-compile with Emscripten using native tools

LLVM_NATIVE_BUILD := $(LLVM_BUILD_DIR)/native
CLANG_LIBS := clangBasic clangLex clangAST clangParse clangFrontend clangSema
LLVM_CORE_LIBS := LLVMCore LLVMSupport
LLVM_PATCH := gcc_11_llvm_patch.diff
LLVM_PATCH_MARKER := llvm-project/.patched

# Apply GCC 11 / Emscripten compatibility patches to LLVM
$(LLVM_PATCH_MARKER): $(LLVM_PATCH)
	@echo "Checking if LLVM patch needs to be applied..."
	@cd llvm-project && \
		if git apply --check ../$(LLVM_PATCH) 2>/dev/null; then \
			echo "Applying GCC 11 / Emscripten compatibility patch..."; \
			git apply ../$(LLVM_PATCH); \
			echo "Patch applied successfully"; \
		else \
			echo "Patch already applied or not needed"; \
		fi
	@touch $(LLVM_PATCH_MARKER)

# Convenience target to apply LLVM patch manually
llvm-patch: $(LLVM_PATCH_MARKER)

# Stage 1: Build native tools (llvm-tblgen, clang-tblgen)
# Use GCC 11 for compatibility with LLVM 8.0.1 (GCC 15 is too new)
$(LLVM_NATIVE_BUILD)/bin/llvm-tblgen: llvm-project/llvm/CMakeLists.txt $(LLVM_PATCH_MARKER)
	@echo "Building native LLVM tools (llvm-tblgen, clang-tblgen)..."
	@echo "Using GCC 11 for compatibility with LLVM 8.0.1..."
	@mkdir -p $(LLVM_NATIVE_BUILD)
	cd $(LLVM_NATIVE_BUILD) && \
		CC=gcc-11 CXX=g++-11 cmake ../../llvm \
			-DCMAKE_BUILD_TYPE=Release \
			-DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
			-DCMAKE_C_COMPILER=gcc-11 \
			-DCMAKE_CXX_COMPILER=g++-11 \
			-DLLVM_TARGETS_TO_BUILD="X86;WebAssembly" \
			-DLLVM_ENABLE_PROJECTS="clang" \
			-DLLVM_BUILD_TOOLS=ON \
			-DLLVM_INCLUDE_TESTS=OFF \
			-DLLVM_INCLUDE_EXAMPLES=OFF \
			-DLLVM_INCLUDE_BENCHMARKS=OFF && \
		$(MAKE) -j$(NPROC) llvm-tblgen clang-tblgen
	@echo "Native tools built successfully"

# Stage 2: Cross-compile LLVM/Clang with Emscripten
$(LLVM_INSTALL_DIR)/lib/libclangBasic.a: $(LLVM_NATIVE_BUILD)/bin/llvm-tblgen llvm-project/llvm/CMakeLists.txt
	@echo "Building LLVM/Clang for WebAssembly..."
	@mkdir -p $(LLVM_BUILD_DIR)
	cd $(LLVM_BUILD_DIR) && \
		emcmake cmake ../llvm \
			-DCMAKE_BUILD_TYPE=Release \
			-DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
			-DCMAKE_INSTALL_PREFIX=$(CURDIR)/$(LLVM_INSTALL_DIR) \
			-DCMAKE_CROSSCOMPILING=True \
			-DLLVM_TABLEGEN=$(CURDIR)/$(LLVM_NATIVE_BUILD)/bin/llvm-tblgen \
			-DCLANG_TABLEGEN=$(CURDIR)/$(LLVM_NATIVE_BUILD)/bin/clang-tblgen \
			-DLLVM_ENABLE_PROJECTS="clang" \
			-DLLVM_TARGETS_TO_BUILD="WebAssembly" \
			-DLLVM_DEFAULT_TARGET_TRIPLE=wasm32-unknown-emscripten \
			-DLLVM_ENABLE_RTTI=ON \
			-DLLVM_ENABLE_EH=ON \
			-DLLVM_BUILD_TOOLS=OFF \
			-DLLVM_INCLUDE_TESTS=OFF \
			-DLLVM_INCLUDE_EXAMPLES=OFF \
			-DLLVM_INCLUDE_BENCHMARKS=OFF \
			-DLLVM_INCLUDE_UTILS=OFF \
			-DLLVM_INCLUDE_GO_TESTS=OFF \
			-DLLVM_ENABLE_BINDINGS=OFF \
			-DLLVM_ENABLE_THREADS=OFF \
			-DLLVM_ENABLE_BACKTRACES=OFF \
			-DLLVM_ENABLE_UNWIND_TABLES=OFF \
			-DLLVM_ENABLE_CRASH_OVERRIDES=OFF \
			-DLLVM_ENABLE_TERMINFO=OFF \
			-DLLVM_ENABLE_ZLIB=OFF \
			-DLLVM_ENABLE_ZSTD=OFF \
			-DLLVM_ENABLE_LIBXML2=OFF \
			-DLLVM_ENABLE_LIBEDIT=OFF \
			-DLLVM_ENABLE_LIBPFM=OFF \
			-DLLVM_BUILD_STATIC=ON \
			-DLLVM_ENABLE_PIC=ON \
			-DBUILD_SHARED_LIBS=OFF \
			-DCLANG_ENABLE_ARCMT=OFF \
			-DCLANG_ENABLE_STATIC_ANALYZER=OFF \
			-DCLANG_BUILD_TOOLS=OFF \
			-DCLANG_INCLUDE_TESTS=OFF
	@echo "CMake configuration complete. Building libraries..."
	cd $(LLVM_BUILD_DIR) && \
		emmake $(MAKE) -j$(NPROC) $(CLANG_LIBS) $(LLVM_CORE_LIBS)
	@echo "Copying libraries and headers to install directory..."
	@mkdir -p $(LLVM_INSTALL_DIR)/lib
	@mkdir -p $(LLVM_INSTALL_DIR)/include
	@echo "  - Copying libraries..."
	@cp -r $(LLVM_BUILD_DIR)/lib/*.a $(LLVM_INSTALL_DIR)/lib/ 2>/dev/null || true
	@echo "  - Copying LLVM headers..."
	@cp -r llvm-project/llvm/include/* $(LLVM_INSTALL_DIR)/include/ 2>/dev/null || true
	@echo "  - Copying Clang headers..."
	@cp -r llvm-project/clang/include/* $(LLVM_INSTALL_DIR)/include/ 2>/dev/null || true
	@echo "  - Copying generated headers (LLVM)..."
	@cp -r $(LLVM_BUILD_DIR)/include/* $(LLVM_INSTALL_DIR)/include/ 2>/dev/null || true
	@echo "  - Copying generated headers (Clang)..."
	@cp -r $(LLVM_BUILD_DIR)/tools/clang/include/* $(LLVM_INSTALL_DIR)/include/ 2>/dev/null || true
	@echo "LLVM/Clang build complete"

$(LLVM_INSTALL_DIR)/lib/libLLVMCore.a: $(LLVM_INSTALL_DIR)/lib/libclangBasic.a

#==============================================================================
# GMP, MPFR, and other dependencies
#==============================================================================

# GMP library
$(LIBS_DIR)/dllgmp.wasm: gmp-6.1.2/configure
	@echo "Building GMP for WASM..."
	@mkdir -p $(INSTALL_DIR)
	cd gmp-6.1.2 && \
		$(MAKE) clean 2>/dev/null || true && \
		$(EMCONFIGURE) ./configure \
			--disable-assembly \
			--host=none \
			--enable-cxx \
			--prefix=$(CURDIR)/$(INSTALL_DIR) \
			CFLAGS="-fPIC" \
			CXXFLAGS="-fPIC" && \
		$(EMMAKE) $(MAKE) -j$(NPROC) && \
		$(EMMAKE) $(MAKE) install
	@echo "Creating dllgmp.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllgmp.wasm \
		-Wl,--whole-archive $(LIBS_DIR)/libgmp.a -Wl,--no-whole-archive

# MPFR library
$(LIBS_DIR)/dllmpfr.wasm: $(LIBS_DIR)/dllgmp.wasm mpfr-4.2.2/configure
	@echo "Building MPFR for WASM..."
	cd mpfr-4.2.2 && \
		$(MAKE) clean 2>/dev/null || true && \
		touch aclocal.m4 configure && \
		find . -name "Makefile.in" -exec touch {} \; && \
		$(EMCONFIGURE) ./configure \
			--host=none \
			--with-gmp=$(CURDIR)/$(INSTALL_DIR) \
			--prefix=$(CURDIR)/$(INSTALL_DIR) \
			CFLAGS="-fPIC" \
			LDFLAGS="-L$(CURDIR)/$(LIBS_DIR)" && \
		$(EMMAKE) $(MAKE) -j$(NPROC) && \
		$(EMMAKE) $(MAKE) install
	@echo "Creating dllmpfr.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllmpfr.wasm \
		-Wl,--whole-archive $(LIBS_DIR)/libmpfr.a -Wl,--no-whole-archive \
		-L$(LIBS_DIR) -lgmp

# MLGMPIDL - OCaml bindings to GMP/MPFR (includes camlidl runtime)
MLGMPIDL_MODULES := gmp_caml mpz_caml mpq_caml mpf_caml mpfr_caml gmp_random_caml
MLGMPIDL_CFLAGS := -I$(OCAML_STDLIB) -I$(shell opam var lib)/camlidl -I$(CURDIR)/$(INSTALL_DIR)/include -I$(CURDIR)/mlgmpidl

$(LIBS_DIR)/dllgmp_caml.wasm: $(LIBS_DIR)/dllmpfr.wasm mlgmpidl/configure camlidl/runtime/camlidlruntime.h
	@echo "Generating MLGMPIDL C stubs from IDL files..."
	cd mlgmpidl && \
		$(MAKE) clean 2>/dev/null || true && \
		$(EMCONFIGURE) ./configure \
			-prefix $(CURDIR)/$(INSTALL_DIR) \
			-gmp-prefix $(CURDIR)/$(INSTALL_DIR) \
			-mpfr-prefix $(CURDIR)/$(INSTALL_DIR) && \
		$(MAKE) mpz_caml.c mpq_caml.c mpf_caml.c mpfr_caml.c gmp_random_caml.c
	@echo "Compiling MLGMPIDL C stubs with emcc..."
	@for module in $(MLGMPIDL_MODULES); do \
		echo "  Compiling $$module.c..."; \
		$(EMCC) -c $(EMCC_SIDE_MODULE) $(MLGMPIDL_CFLAGS) \
			-o mlgmpidl/$$module.o mlgmpidl/$$module.c; \
	done
	@echo "Linking dllgmp_caml.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllgmp_caml.wasm \
		$(MLGMPIDL_CFLAGS) \
		camlidl/runtime/idlalloc.c \
		$(MLGMPIDL_MODULES:%=mlgmpidl/%.o) \
		-L$(LIBS_DIR) -lgmp -lmpfr \
		-sERROR_ON_UNDEFINED_SYMBOLS=0

# Apron library and domains (C part only)
$(LIBS_DIR)/libapron.a: $(LIBS_DIR)/dllmpfr.wasm apron/configure
	@echo "Building Apron C libraries for WASM..."
	cd apron && \
		$(MAKE) clean 2>/dev/null || true && \
		MPFR_PREFIX=$(CURDIR)/$(INSTALL_DIR) \
		GMP_PREFIX=$(CURDIR)/$(INSTALL_DIR) \
		$(EMCONFIGURE) ./configure \
			-no-java -no-cxx -no-ppl -no-pplite \
			-no-ocaml -no-strip \
			-prefix $(CURDIR)/$(INSTALL_DIR) && \
		$(EMMAKE) $(MAKE) -j$(NPROC) CFLAGS_EXTRA="-fPIC" CXXFLAGS_EXTRA="-fPIC" && \
		$(EMMAKE) $(MAKE) install

# MLAPRONIDL - OCaml bindings to Apron
MLAPRONIDL_IDL := scalar interval coeff dim linexpr0 lincons0 generator0 texpr0 tcons0 manager abstract0 var environment linexpr1 lincons1 generator1 texpr1 tcons1 abstract1 policy disjunction version
MLAPRONIDL_MODULES := $(MLAPRONIDL_IDL:%=%_caml) apron_caml
MLAPRONIDL_CFLAGS := -I$(OCAML_STDLIB) -I$(shell opam var lib)/camlidl -I$(CURDIR)/$(INSTALL_DIR)/include -I$(CURDIR)/apron/mlapronidl -I$(CURDIR)/apron/apron -I$(CURDIR)/mlgmpidl
CAMLIDL := $(shell opam var bin)/camlidl
PERL := /usr/bin/perl

$(LIBS_DIR)/dllapron_caml.wasm: $(LIBS_DIR)/libapron.a apron/mlapronidl/Makefile
	@echo "Generating MLAPRONIDL C stubs from IDL files..."
	@cd apron/mlapronidl && \
		for idl in $(MLAPRONIDL_IDL); do \
			echo "  Generating $$idl from IDL..."; \
			$(CAMLIDL) -no-include -prepro "$(PERL) macros.pl" $$idl.idl && \
			$(PERL) perlscript_c.pl < $${idl}_stubs.c > $${idl}_caml.c && \
			$(PERL) perlscript_caml.pl < $$idl.ml > $$idl.ml.tmp && mv $$idl.ml.tmp $$idl.ml && \
			$(PERL) perlscript_caml.pl < $$idl.mli > $$idl.mli.tmp && mv $$idl.mli.tmp $$idl.mli; \
		done
	@echo "Compiling MLAPRONIDL C stubs with emcc..."
	@for module in $(MLAPRONIDL_MODULES); do \
		echo "  Compiling $$module.c..."; \
		$(EMCC) -c $(EMCC_SIDE_MODULE) $(MLAPRONIDL_CFLAGS) \
			-o apron/mlapronidl/$$module.o apron/mlapronidl/$$module.c; \
	done
	@echo "Linking dllapron_caml.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllapron_caml.wasm \
		$(MLAPRONIDL_CFLAGS) \
		camlidl/runtime/idlalloc.c \
		$(MLAPRONIDL_MODULES:%=apron/mlapronidl/%.o) \
		-L$(LIBS_DIR) -lapron

# Box domain OCaml bindings
BOX_CFLAGS := -I$(OCAML_STDLIB) -I$(shell opam var lib)/camlidl -I$(CURDIR)/$(INSTALL_DIR)/include -I$(CURDIR)/apron/mlapronidl -I$(CURDIR)/apron/apron -I$(CURDIR)/apron/box -I$(CURDIR)/mlgmpidl

$(LIBS_DIR)/dllboxMPQ_caml.wasm: $(LIBS_DIR)/libboxMPQ.a $(LIBS_DIR)/dllapron_caml.wasm
	@echo "Generating Box domain OCaml bindings..."
	@cd apron/box && \
		mkdir -p tmp && \
		cp box.idl ../mlapronidl/*.idl tmp/ && \
		cd tmp && $(CAMLIDL) -no-include -nocpp -I . box.idl && \
		cd .. && \
		$(PERL) ../mlapronidl/perlscript_c.pl < tmp/box_stubs.c > box_caml.c && \
		$(PERL) perlscript_caml.pl < tmp/box.ml > box.ml && \
		$(PERL) perlscript_caml.pl < tmp/box.mli > box.mli
	@echo "Compiling Box domain C stubs with emcc..."
	$(EMCC) -c $(EMCC_SIDE_MODULE) $(BOX_CFLAGS) -DNUM_MPQ \
		-o apron/box/box_caml.o apron/box/box_caml.c
	@echo "Linking dllboxMPQ_caml.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllboxMPQ_caml.wasm \
		$(BOX_CFLAGS) \
		camlidl/runtime/idlalloc.c \
		apron/box/box_caml.o \
		-L$(LIBS_DIR) -l:libboxMPQ.a -l:libapron.a

# Octagon domain OCaml bindings
OCT_CFLAGS := -I$(OCAML_STDLIB) -I$(shell opam var lib)/camlidl -I$(CURDIR)/$(INSTALL_DIR)/include -I$(CURDIR)/apron/mlapronidl -I$(CURDIR)/apron/apron -I$(CURDIR)/apron/octagons -I$(CURDIR)/mlgmpidl

$(LIBS_DIR)/dlloctMPQ_caml.wasm: $(LIBS_DIR)/liboctMPQ.a $(LIBS_DIR)/dllapron_caml.wasm
	@echo "Generating Octagon domain OCaml bindings..."
	@cd apron/octagons && \
		mkdir -p tmp && \
		cp oct.idl ../mlapronidl/*.idl tmp/ && \
		cd tmp && $(CAMLIDL) -no-include -nocpp -I . oct.idl && \
		cd .. && \
		$(PERL) perlscript_c.pl < tmp/oct_stubs.c > oct_caml.c && \
		$(PERL) perlscript_caml.pl < tmp/oct.ml > oct.ml && \
		$(PERL) perlscript_caml.pl < tmp/oct.mli > oct.mli
	@echo "Compiling Octagon domain C stubs with emcc..."
	$(EMCC) -c $(EMCC_SIDE_MODULE) $(OCT_CFLAGS) -DNUM_MPQ \
		-o apron/octagons/oct_caml.o apron/octagons/oct_caml.c
	@echo "Linking dlloctMPQ_caml.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dlloctMPQ_caml.wasm \
		$(OCT_CFLAGS) \
		camlidl/runtime/idlalloc.c \
		apron/octagons/oct_caml.o \
		-L$(LIBS_DIR) -l:liboctMPQ.a -l:libapron.a

# Polka domain OCaml bindings
POLKA_CFLAGS := -I$(OCAML_STDLIB) -I$(shell opam var lib)/camlidl -I$(CURDIR)/$(INSTALL_DIR)/include -I$(CURDIR)/apron/mlapronidl -I$(CURDIR)/apron/apron -I$(CURDIR)/apron/newpolka -I$(CURDIR)/mlgmpidl

$(LIBS_DIR)/dllpolkaMPQ_caml.wasm: $(LIBS_DIR)/libpolkaMPQ.a $(LIBS_DIR)/dllapron_caml.wasm
	@echo "Generating Polka domain OCaml bindings..."
	@cd apron/newpolka && \
		mkdir -p tmp && \
		cp polka.idl ../mlapronidl/manager.idl tmp/ && \
		cd tmp && $(CAMLIDL) -no-include -nocpp polka.idl && \
		cd .. && \
		cp tmp/polka_stubs.c polka_caml.c && \
		$(PERL) perlscript_caml.pl < tmp/polka.ml > polka.ml && \
		$(PERL) perlscript_caml.pl < tmp/polka.mli > polka.mli
	@echo "Compiling Polka domain C stubs with emcc..."
	$(EMCC) -c $(EMCC_SIDE_MODULE) $(POLKA_CFLAGS) -DNUM_MPQ \
		-o apron/newpolka/polka_caml.o apron/newpolka/polka_caml.c
	@echo "Linking dllpolkaMPQ_caml.wasm..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllpolkaMPQ_caml.wasm \
		$(POLKA_CFLAGS) \
		camlidl/runtime/idlalloc.c \
		apron/newpolka/polka_caml.o \
		-L$(LIBS_DIR) -l:libpolkaMPQ.a -l:libapron.a

# Apron WASM modules for domains
$(LIBS_DIR)/dllapron.wasm: $(LIBS_DIR)/dllapron_caml.wasm
	@echo "Creating Apron domain WASM modules..."
	@if [ -f "$(LIBS_DIR)/libboxMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) -o $(LIBS_DIR)/dllboxMPQ.wasm -Wl,--whole-archive $(LIBS_DIR)/libboxMPQ.a -Wl,--no-whole-archive $(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/liboctMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) -o $(LIBS_DIR)/dlloctMPQ.wasm -Wl,--whole-archive $(LIBS_DIR)/liboctMPQ.a -Wl,--no-whole-archive $(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/libpolkaMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) -o $(LIBS_DIR)/dllpolkaMPQ.wasm -Wl,--whole-archive $(LIBS_DIR)/libpolkaMPQ.a -Wl,--no-whole-archive $(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/libapron.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) -o $(LIBS_DIR)/dllapron.wasm -Wl,--whole-archive $(LIBS_DIR)/libapron.a -Wl,--no-whole-archive $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi

#==============================================================================
# OCaml bytecode
#==============================================================================

ocaml: $(DIST_DIR)/mopsa_worker.bc

$(DIST_DIR)/mopsa_worker.bc: backend/wasm/mopsa_worker.ml
	@echo "Building OCaml bytecode..."
	@rm -f backend/wasm/mopsa_worker.bc backend/wasm/*.wasm
	$(OPAM_EXEC) dune build --profile release backend/wasm/mopsa_worker.bc
	@mkdir -p $(DIST_DIR)
	@cp $(BUILD_DIR)/default/backend/wasm/mopsa_worker.bc $(DIST_DIR)/

#==============================================================================
# WASM stubs
#==============================================================================

wasm: $(DIST_DIR)/dllmopsa_utils_stubs.wasm $(DIST_DIR)/dllmopsa_c_parser_stubs.wasm \
      $(DIST_DIR)/dllcamlstr.wasm $(DIST_DIR)/dllzarith.wasm $(DIST_DIR)/dllgmp_caml.wasm \
      $(DIST_DIR)/dllclang_parser.wasm

# Copy OCaml runtime stubs from ocaml-wasm package
$(DIST_DIR)/dllcamlstr.wasm: node_modules/ocaml-wasm/bin/dllcamlstr.wasm
	@echo "Copying OCaml runtime stubs..."
	@mkdir -p $(DIST_DIR)
	@for stub in dllcamlstr dllunix dllthreads; do \
		cp node_modules/ocaml-wasm/bin/$${stub}.wasm $(DIST_DIR)/; \
	done

# Copy zarith from @ocaml-wasm package
$(DIST_DIR)/dllzarith.wasm: node_modules/@ocaml-wasm/4.12--zarith/bin/dllzarith.wasm
	@echo "Copying dllzarith.wasm..."
	@mkdir -p $(DIST_DIR)
	@cp node_modules/@ocaml-wasm/4.12--zarith/bin/dllzarith.wasm $(DIST_DIR)/

# Build MOPSA-specific stubs
$(DIST_DIR)/dllmopsa_utils_stubs.wasm: mopsa-analyzer/utils/itvUtils/floats_round.c
	@echo "Building dllmopsa_utils_stubs.wasm..."
	@mkdir -p $(DIST_DIR)
	$(EMCC) $(EMCC_SIDE_MODULE) \
		mopsa-analyzer/utils/itvUtils/floats_round.c \
		-o $(DIST_DIR)/dllmopsa_utils_stubs.wasm \
		-I$(OCAML_STDLIB)

$(DIST_DIR)/dllmopsa_c_parser_stubs.wasm: backend/wasm/c_parser_stubs.c
	@echo "Building dllmopsa_c_parser_stubs.wasm..."
	@mkdir -p $(DIST_DIR)
	$(EMCC) $(EMCC_SIDE_MODULE) \
		backend/wasm/c_parser_stubs.c \
		-o $(DIST_DIR)/dllmopsa_c_parser_stubs.wasm \
		-I$(OCAML_STDLIB)

# Build stub GMP/MPFR/Apron library for minimal MOPSA
$(DIST_DIR)/dllgmp_caml.wasm: backend/wasm/gmp_all_stubs.c
	@echo "Building stub GMP/MPFR/Apron library..."
	@mkdir -p $(DIST_DIR)
	$(EMCC) $(EMCC_SIDE_MODULE) \
		backend/wasm/gmp_all_stubs.c \
		-o $(DIST_DIR)/dllgmp_caml.wasm \
		-I$(OCAML_STDLIB) \
		-I$(shell opam var lib)/camlidl \
		-sERROR_ON_UNDEFINED_SYMBOLS=0
	@echo "Creating symlinks for other numerical libraries..."
	@cd $(DIST_DIR) && \
		ln -sf dllgmp_caml.wasm dllgmp.wasm && \
		ln -sf dllgmp_caml.wasm dllmpfr.wasm && \
		ln -sf dllgmp_caml.wasm dllapron.wasm && \
		ln -sf dllgmp_caml.wasm dllapron_caml.wasm && \
		ln -sf dllgmp_caml.wasm dllboxMPQ_caml.wasm && \
		ln -sf dllgmp_caml.wasm dlloctMPQ_caml.wasm && \
		ln -sf dllgmp_caml.wasm dllpolkaMPQ_caml.wasm

# Clang parser library (Clang_to_ml.cc + libclang-cpp + libLLVM)
CLANG_TO_ML_SRC := mopsa-analyzer/parsers/c/lib/parser/Clang_to_ml.cc
CLANG_TO_ML_OBJ := $(BUILD_DIR)/Clang_to_ml.o
CLANG_CXXFLAGS := -std=c++17 -fno-exceptions -fno-rtti \
	-I$(LLVM_INSTALL_DIR)/include \
	-I$(OCAML_STDLIB) \
	-I$(shell opam var lib)/zarith \
	-DCLANG_VERSION_MAJOR=$(CLANG_VERSION) \
	-DCLANGRESOURCE=\"$(CLANG_RESOURCE_DIR)\" \
	-D_GNU_SOURCE -D__STDC_CONSTANT_MACROS -D__STDC_FORMAT_MACROS -D__STDC_LIMIT_MACROS \
	-Wno-strict-aliasing -Wall -Wno-comment

$(CLANG_TO_ML_OBJ): $(CLANG_TO_ML_SRC) $(LLVM_INSTALL_DIR)/lib/libclangBasic.a
	@echo "Compiling Clang_to_ml.cc..."
	@mkdir -p $(BUILD_DIR)
	$(EMCC) -c $(EMCC_SIDE_MODULE) -x c++ $(CLANG_CXXFLAGS) \
		-o $(CLANG_TO_ML_OBJ) $(CLANG_TO_ML_SRC)

# Combined Clang parser library (includes Clang_to_ml + all Clang/LLVM dependencies)
# Link all the Clang libraries we built
$(DIST_DIR)/dllclang_parser.wasm: $(CLANG_TO_ML_OBJ) $(LLVM_INSTALL_DIR)/lib/libclangBasic.a
	@echo "Linking dllclang_parser.wasm (combined Clang library)..."
	@mkdir -p $(DIST_DIR)
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(DIST_DIR)/dllclang_parser.wasm \
		$(CLANG_TO_ML_OBJ) \
		-L$(LLVM_INSTALL_DIR)/lib \
		-Wl,--whole-archive \
		-lclangFrontend -lclangParse -lclangSema -lclangAST -lclangLex -lclangBasic \
		-lLLVMCore -lLLVMSupport \
		-Wl,--no-whole-archive \
		-lstdc++ \
		-sERROR_ON_UNDEFINED_SYMBOLS=0 \
		-sALLOW_MEMORY_GROWTH=1
	@echo "Clang parser library built successfully"

#==============================================================================
# TypeScript
#==============================================================================

ts: $(DIST_DIR)/mopsa_worker.js

$(DIST_DIR)/mopsa_worker.js: backend/wasm/mopsa_worker.ts backend/wasm/core.ts esbuild.mjs
	@echo "Building TypeScript..."
	@node esbuild.mjs

#==============================================================================
# Frontend (React application)
#==============================================================================

FRONTEND_DIR := Frontend

# Install frontend dependencies
frontend-deps: $(FRONTEND_DIR)/node_modules/.package-lock.json

$(FRONTEND_DIR)/node_modules/.package-lock.json: $(FRONTEND_DIR)/package.json
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && $(PNPM) install
	@touch $(FRONTEND_DIR)/node_modules/.package-lock.json

# Build frontend
frontend: frontend-deps ts $(DIST_DIR)/mopsa_worker.bc share
	@echo "Building frontend..."
	cd $(FRONTEND_DIR) && $(PNPM) run build

#==============================================================================
# Distribution
#==============================================================================

$(DIST_DIR)/index.html: backend/wasm/index.html
	@mkdir -p $(DIST_DIR)
	@cp backend/wasm/index.html $(DIST_DIR)/index.html

$(DIST_DIR)/ocamlrun.wasm: node_modules/ocaml-wasm/bin/ocamlrun.wasm
	@mkdir -p $(DIST_DIR)
	@cp node_modules/ocaml-wasm/bin/ocamlrun.wasm $(DIST_DIR)/

# Generate share.json from share/mopsa directory for WASM virtual filesystem
$(DIST_DIR)/share.json: $(shell find share/mopsa -type f 2>/dev/null)
	@echo "Generating share.json..."
	@mkdir -p $(DIST_DIR)
	@node $(FRONTEND_DIR)/folderToJson.cjs mopsa-analyzer/share/mopsa -o $(DIST_DIR)/share.json

share: $(DIST_DIR)/share.json

#==============================================================================
# Summary and utilities
#==============================================================================

summary: $(DIST_DIR)/ocamlrun.wasm $(DIST_DIR)/dllgmp.wasm
	@echo ""
	@echo "========================================="
	@echo "Build Summary"
	@echo "========================================="
	@if [ -f "$(DIST_DIR)/mopsa_worker.bc" ]; then \
		echo "mopsa_worker.bc: $$(du -h $(DIST_DIR)/mopsa_worker.bc | cut -f1)"; \
	fi
	@if [ -f "$(DIST_DIR)/mopsa_worker.js" ]; then \
		echo "mopsa_worker.js: $$(du -h $(DIST_DIR)/mopsa_worker.js | cut -f1)"; \
	fi
	@if [ -f "$(DIST_DIR)/ocamlrun.wasm" ]; then \
		echo "ocamlrun.wasm: $$(du -h $(DIST_DIR)/ocamlrun.wasm | cut -f1)"; \
	fi
	@if [ -f "$(DIST_DIR)/index.html" ]; then \
		echo "Frontend: Built (index.html present)"; \
	fi
	@echo ""
	@echo "WASM stubs:"
	@ls -lh $(DIST_DIR)/*.wasm 2>/dev/null | awk '{print "  " $$9 " (" $$5 ")"}' || echo "  (none)"
	@echo ""
	@echo "To test: make serve"
	@echo "Then open: http://localhost:8080"
	@echo "========================================="

serve:
	@echo "Starting demo server on http://localhost:8080"
	@echo "Serving from ./dist directory..."
	cd $(DIST_DIR) && python3 -m http.server 8080

#==============================================================================
# Clean
#==============================================================================

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@rm -rf dist
	@rm -f backend/wasm/mopsa_worker.bc
	@rm -f backend/wasm/*.wasm

clean-frontend:
	@echo "Cleaning frontend..."
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/dist

clean-deps:
	@echo "Cleaning native dependencies..."
	@cd gmp-6.1.2 && $(MAKE) clean 2>/dev/null || true
	@cd mpfr-4.2.2 && $(MAKE) clean 2>/dev/null || true
	@cd mlgmpidl && $(MAKE) clean 2>/dev/null || true
	@cd apron && $(MAKE) clean 2>/dev/null || true
	@rm -rf $(LLVM_BUILD_DIR)
	@rm -rf $(LLVM_NATIVE_BUILD)
	@rm -rf $(INSTALL_DIR)

clean-all: clean clean-deps
