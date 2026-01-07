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
	@echo "  all      - Build everything (default)"
	@echo "  deps     - Build native dependencies (GMP, MPFR, MLGMPIDL, Apron)"
	@echo "  ocaml    - Build OCaml bytecode"
	@echo "  wasm     - Build WASM stubs"
	@echo "  ts       - Build TypeScript"
	@echo "  clean    - Clean build artifacts"
	@echo "  serve    - Start demo server on port 8080"

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

deps: $(LIBS_DIR)/dllgmp.wasm $(LIBS_DIR)/dllmpfr.wasm $(LIBS_DIR)/dllgmp_caml.wasm $(LIBS_DIR)/dllapron.wasm

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
$(LIBS_DIR)/dllgmp_caml.wasm: $(LIBS_DIR)/dllmpfr.wasm mlgmpidl/configure camlidl/runtime/camlidlruntime.h
	@echo "Building MLGMPIDL C stubs for WASM (with camlidl runtime)..."
	$(EMCC) $(EMCC_SIDE_MODULE) \
		-o $(LIBS_DIR)/dllgmp_caml.wasm \
		-I$(OCAML_STDLIB) \
		-I$(shell opam var lib)/camlidl \
		-I$(CURDIR)/$(INSTALL_DIR)/include \
		camlidl/runtime/idlalloc.c \
		mlgmpidl/gmp_caml.c \
		mlgmpidl/mpz_caml.c \
		mlgmpidl/mpq_caml.c \
		mlgmpidl/mpf_caml.c \
		mlgmpidl/mpfr_caml.c \
		mlgmpidl/gmp_random_caml.c \
		-L$(LIBS_DIR) -lgmp -lmpfr

# Apron library and domains
$(LIBS_DIR)/dllapron.wasm: $(LIBS_DIR)/dllmpfr.wasm apron/configure
	@echo "Building Apron for WASM..."
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
	@echo "Creating Apron WASM modules..."
	@if [ -f "$(LIBS_DIR)/libboxMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) \
			-o $(LIBS_DIR)/dllboxMPQ.wasm \
			-Wl,--whole-archive $(LIBS_DIR)/libboxMPQ.a -Wl,--no-whole-archive \
			$(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/liboctMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) \
			-o $(LIBS_DIR)/dlloctMPQ.wasm \
			-Wl,--whole-archive $(LIBS_DIR)/liboctMPQ.a -Wl,--no-whole-archive \
			$(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/libpolkaMPQ.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) \
			-o $(LIBS_DIR)/dllpolkaMPQ.wasm \
			-Wl,--whole-archive $(LIBS_DIR)/libpolkaMPQ.a -Wl,--no-whole-archive \
			$(LIBS_DIR)/libapron.a $(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
	fi
	@if [ -f "$(LIBS_DIR)/libapron.a" ]; then \
		$(EMCC) $(EMCC_SIDE_MODULE) \
			-o $(LIBS_DIR)/dllapron.wasm \
			-Wl,--whole-archive $(LIBS_DIR)/libapron.a -Wl,--no-whole-archive \
			$(LIBS_DIR)/libmpfr.a $(LIBS_DIR)/libgmp.a; \
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
      $(DIST_DIR)/dllcamlstr.wasm $(DIST_DIR)/dllzarith.wasm $(DIST_DIR)/dllgmp.wasm

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

# Copy native library WASM modules to dist
$(DIST_DIR)/dllgmp.wasm: $(LIBS_DIR)/dllgmp.wasm
	@echo "Copying native library WASM modules..."
	@mkdir -p $(DIST_DIR)
	@cp $(LIBS_DIR)/dllgmp.wasm $(DIST_DIR)/
	@if [ -f "$(LIBS_DIR)/dllmpfr.wasm" ]; then \
		cp $(LIBS_DIR)/dllmpfr.wasm $(DIST_DIR)/; \
	fi
	@if [ -f "$(LIBS_DIR)/dllgmp_caml.wasm" ]; then \
		cp $(LIBS_DIR)/dllgmp_caml.wasm $(DIST_DIR)/; \
	fi
	@for module in dllapron dllboxMPQ dlloctMPQ dllpolkaMPQ; do \
		if [ -f "$(LIBS_DIR)/$${module}.wasm" ]; then \
			cp $(LIBS_DIR)/$${module}.wasm $(DIST_DIR)/; \
		fi; \
	done

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
