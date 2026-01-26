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

.PHONY: all clean deps ocaml wasm ts serve check-env help
.SILENT: check-env

# Directories
INSTALL_DIR := libs
LIBS_DIR := $(INSTALL_DIR)/lib
DIST_DIR := dist
BUILD_DIR := _build

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

#==============================================================================
# Main targets
#==============================================================================

all: deps ocaml wasm ts summary

help:
	@echo "MOPSA WASM Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all            - Build everything (default)"
	@echo "  deps           - Build native dependencies (GMP, MPFR, MLGMPIDL, Apron)"
	@echo "  ocaml          - Build OCaml bytecode"
	@echo "  wasm           - Build WASM stubs"
	@echo "  ts             - Build TypeScript"
	@echo "  clean          - Clean build artifacts"
	@echo "  serve          - Start demo server on port 8080"
	@echo ""
	@echo "LLVM/Clang targets:"
	@echo "  clang-ast-native - Build native tablegen tools (stage 1)"
	@echo "  clang-ast        - Build minimal clang-ast.wasm for C AST dumping"
	@echo "  clean-clang-ast  - Clean clang-ast build artifacts"

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

deps: $(LIBS_DIR)/dllgmp.wasm $(LIBS_DIR)/dllmpfr.wasm $(LIBS_DIR)/dllgmp_caml.wasm $(LIBS_DIR)/dllapron_caml.wasm $(LIBS_DIR)/dllboxMPQ_caml.wasm $(LIBS_DIR)/dlloctMPQ_caml.wasm $(LIBS_DIR)/dllpolkaMPQ_caml.wasm $(LIBS_DIR)/dllapron.wasm

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
      $(DIST_DIR)/dllcamlstr.wasm $(DIST_DIR)/dllzarith.wasm $(DIST_DIR)/dllgmp_caml.wasm

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

#==============================================================================
# TypeScript
#==============================================================================

ts: $(DIST_DIR)/mopsa_worker.js

$(DIST_DIR)/mopsa_worker.js: backend/wasm/mopsa_worker.ts backend/wasm/core.ts esbuild.mjs
	@echo "Building TypeScript..."
	@node esbuild.mjs

#==============================================================================
# Distribution
#==============================================================================

$(DIST_DIR)/index.html: backend/wasm/index.html
	@mkdir -p $(DIST_DIR)
	@cp backend/wasm/index.html $(DIST_DIR)/index.html

$(DIST_DIR)/ocamlrun.wasm: node_modules/ocaml-wasm/bin/ocamlrun.wasm
	@mkdir -p $(DIST_DIR)
	@cp node_modules/ocaml-wasm/bin/ocamlrun.wasm $(DIST_DIR)/

#==============================================================================
# Summary and utilities
#==============================================================================

summary: $(DIST_DIR)/index.html $(DIST_DIR)/ocamlrun.wasm $(DIST_DIR)/dllgmp.wasm
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
	@echo ""
	@echo "WASM stubs:"
	@ls -lh $(DIST_DIR)/*.wasm 2>/dev/null | awk '{print "  " $$9 " (" $$5 ")"}' || echo "  (none)"
	@echo ""
	@echo "To test: make serve"
	@echo "Then open: http://localhost:8080"
	@echo "========================================="

serve:
	@echo "Starting demo server on http://localhost:8080"
	$(PNPM) run serve

#==============================================================================
# Clean
#==============================================================================

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@rm -f backend/wasm/mopsa_worker.bc
	@rm -f backend/wasm/*.wasm

clean-deps:
	@echo "Cleaning native dependencies..."
	@cd gmp-6.1.2 && $(MAKE) clean 2>/dev/null || true
	@cd mpfr-4.2.2 && $(MAKE) clean 2>/dev/null || true
	@cd mlgmpidl && $(MAKE) clean 2>/dev/null || true
	@cd apron && $(MAKE) clean 2>/dev/null || true
	@rm -rf $(INSTALL_DIR)

clean-all: clean clean-deps

#==============================================================================
# LLVM/Clang WASM build (for C AST dumping)
#==============================================================================

# WASI SDK paths
WASI_SDK_PATH := /opt/wasi-sdk
WASI_SYSROOT := $(WASI_SDK_PATH)/share/wasi-sysroot
WASI_TOOLCHAIN := $(WASI_SDK_PATH)/share/cmake/wasi-sdk.cmake
WASI_CC := $(WASI_SDK_PATH)/bin/clang
WASI_CXX := $(WASI_SDK_PATH)/bin/clang++
WASI_AR := $(WASI_SDK_PATH)/bin/llvm-ar
WASI_RANLIB := $(WASI_SDK_PATH)/bin/llvm-ranlib

# LLVM project directories
LLVM_PROJECT_DIR := llvm-project
LLVM_NATIVE_BUILD := $(LLVM_PROJECT_DIR)/build/native
LLVM_AST_BUILD := $(LLVM_PROJECT_DIR)/build/clang-ast
LLVM_INSTALL_DIR := $(INSTALL_DIR)/llvm

# Native tablegen tools (built in stage 1)
LLVM_TBLGEN := $(LLVM_NATIVE_BUILD)/bin/llvm-tblgen
CLANG_TBLGEN := $(LLVM_NATIVE_BUILD)/bin/clang-tblgen

# Check that tablegen tools exist
$(LLVM_TBLGEN) $(CLANG_TBLGEN):
	@echo "Error: Native tablegen tools not found."
	@echo "Please build them first with: make clang-ast-native"
	@exit 1

# Stage 1: Build native tablegen tools (if not already built)
.PHONY: clang-ast-native
clang-ast-native:
	@echo "Building native LLVM/Clang tablegen tools..."
	@mkdir -p $(LLVM_NATIVE_BUILD)
	cd $(LLVM_NATIVE_BUILD) && cmake \
		-G "Unix Makefiles" \
		-DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
		-DCMAKE_BUILD_TYPE=Release \
		-DLLVM_ENABLE_PROJECTS="clang" \
		-DLLVM_TARGETS_TO_BUILD="X86" \
		-DLLVM_INCLUDE_TESTS=OFF \
		-DLLVM_INCLUDE_EXAMPLES=OFF \
		-DLLVM_INCLUDE_BENCHMARKS=OFF \
		-DLLVM_INCLUDE_DOCS=OFF \
		-DCLANG_INCLUDE_TESTS=OFF \
		-DCLANG_INCLUDE_DOCS=OFF \
		$(CURDIR)/$(LLVM_PROJECT_DIR)/llvm
	cd $(LLVM_NATIVE_BUILD) && $(MAKE) -j$(NPROC) llvm-tblgen clang-tblgen
	@echo "Native tablegen tools built successfully."

# Stage 2: Build minimal clang for WASI with AST dump support
# This builds a stripped-down clang binary optimized for:
# - C language only (no C++, Objective-C)
# - AST dumping only (no code generation)
# - Minimal binary size
.PHONY: clang-ast
clang-ast: $(LLVM_TBLGEN) $(CLANG_TBLGEN)
	@echo "Building minimal clang-ast for WASI..."
	@mkdir -p $(LLVM_AST_BUILD)
	cd $(LLVM_AST_BUILD) && cmake \
		-G "Unix Makefiles" \
		-DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
		-DCMAKE_TOOLCHAIN_FILE=$(WASI_TOOLCHAIN) \
		-DWASI_SDK_PREFIX=$(WASI_SDK_PATH) \
		-DCMAKE_BUILD_TYPE=MinSizeRel \
		-DCMAKE_SYSROOT=$(WASI_SYSROOT) \
		-DCMAKE_C_FLAGS="-fno-exceptions -D_WASI_EMULATED_SIGNAL -DBINJI_HACK" \
		-DCMAKE_CXX_FLAGS="-fno-exceptions -fno-rtti -D_WASI_EMULATED_SIGNAL -DBINJI_HACK" \
		-DCMAKE_EXE_LINKER_FLAGS="-lwasi-emulated-signal" \
		-DUNIX=ON \
		-DLLVM_ENABLE_PROJECTS="clang" \
		-DLLVM_TARGETS_TO_BUILD="" \
		-DLLVM_DEFAULT_TARGET_TRIPLE="wasm32-wasi" \
		-DLLVM_TABLEGEN=$(CURDIR)/$(LLVM_TBLGEN) \
		-DCLANG_TABLEGEN=$(CURDIR)/$(CLANG_TBLGEN) \
		-DLLVM_BUILD_TOOLS=OFF \
		-DLLVM_BUILD_UTILS=OFF \
		-DLLVM_INCLUDE_TESTS=OFF \
		-DLLVM_INCLUDE_EXAMPLES=OFF \
		-DLLVM_INCLUDE_BENCHMARKS=OFF \
		-DLLVM_INCLUDE_DOCS=OFF \
		-DLLVM_ENABLE_THREADS=OFF \
		-DLLVM_ENABLE_PIC=OFF \
		-DLLVM_ENABLE_BACKTRACES=OFF \
		-DLLVM_ENABLE_CRASH_OVERRIDES=OFF \
		-DLLVM_ENABLE_TERMINFO=OFF \
		-DLLVM_ENABLE_ZLIB=OFF \
		-DLLVM_ENABLE_LIBXML2=OFF \
		-DCLANG_BUILD_TOOLS=ON \
		-DCLANG_ENABLE_ARCMT=OFF \
		-DCLANG_ENABLE_STATIC_ANALYZER=OFF \
		-DCLANG_INCLUDE_TESTS=OFF \
		-DCLANG_INCLUDE_DOCS=OFF \
		-DCLANG_TOOL_CLANG_CHECK_BUILD=OFF \
		-DCLANG_TOOL_CLANG_DIFF_BUILD=OFF \
		-DCLANG_TOOL_CLANG_FORMAT_BUILD=OFF \
		-DCLANG_TOOL_CLANG_FUZZER_BUILD=OFF \
		-DCLANG_TOOL_CLANG_IMPORT_TEST_BUILD=OFF \
		-DCLANG_TOOL_CLANG_OFFLOAD_BUNDLER_BUILD=OFF \
		-DCLANG_TOOL_CLANG_REFACTOR_BUILD=OFF \
		-DCLANG_TOOL_CLANG_RENAME_BUILD=OFF \
		-DCLANG_TOOL_CLANG_SCAN_DEPS_BUILD=OFF \
		-DCLANG_TOOL_DIAGTOOL_BUILD=OFF \
		-DCLANG_TOOL_DRIVER_BUILD=ON \
		$(CURDIR)/$(LLVM_PROJECT_DIR)/llvm
	@echo "Building clang binary..."
	cd $(LLVM_AST_BUILD) && $(MAKE) -j$(NPROC) clang
	@echo "Installing clang-ast.wasm..."
	@mkdir -p $(LLVM_INSTALL_DIR)/bin
	@cp $(LLVM_AST_BUILD)/bin/clang-8 $(LLVM_INSTALL_DIR)/bin/clang-ast.wasm 2>/dev/null || \
		cp $(LLVM_AST_BUILD)/bin/clang $(LLVM_INSTALL_DIR)/bin/clang-ast.wasm
	@echo ""
	@echo "========================================="
	@echo "clang-ast.wasm built successfully!"
	@echo "Output: $(LLVM_INSTALL_DIR)/bin/clang-ast.wasm"
	@if [ -f "$(LLVM_INSTALL_DIR)/bin/clang-ast.wasm" ]; then \
		echo "Size: $$(du -h $(LLVM_INSTALL_DIR)/bin/clang-ast.wasm | cut -f1)"; \
	fi
	@echo "========================================="

# Clean clang-ast build
.PHONY: clean-clang-ast
clean-clang-ast:
	@echo "Cleaning clang-ast build..."
	@rm -rf $(LLVM_AST_BUILD)
	@rm -f $(LLVM_INSTALL_DIR)/bin/clang-ast.wasm
