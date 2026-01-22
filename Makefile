# Makefile for MOPSA WebAssembly build (minimal version with stubs)
#
# Prerequisites:
# - OCaml 4.12.0 or 4.13.x (opam switch 4.12.0)
# - Node.js >= 18
# - pnpm installed (npm install -g pnpm)
# - wasi-sdk installed (default: /opt/wasi-sdk)
#
# Usage:
#   make              # Full build
#   make ocaml        # Build OCaml bytecode only
#   make wasm         # Build WASM stubs only
#   make ts           # Build TypeScript only
#   make clean        # Clean build artifacts
#   make serve        # Start demo server

.PHONY: all clean ocaml wasm ts serve check-env help
.SILENT: check-env
.DELETE_ON_ERROR:

# Directories
INSTALL_DIR := libs
LIBS_DIR := $(INSTALL_DIR)/lib
DIST_DIR := dist
BUILD_DIR := _build

# WASI SDK configuration
# Override WASI_SDK_PATH if installed elsewhere
WASI_SDK_PATH ?= /opt/wasi-sdk
WASI_CC := $(WASI_SDK_PATH)/bin/clang
WASI_CXX := $(WASI_SDK_PATH)/bin/clang++
WASI_AR := $(WASI_SDK_PATH)/bin/llvm-ar
WASI_RANLIB := $(WASI_SDK_PATH)/bin/llvm-ranlib
WASI_LD := $(WASI_SDK_PATH)/bin/wasm-ld
WASI_SYSROOT := $(WASI_SDK_PATH)/share/wasi-sysroot

# Tools
OPAM_EXEC := opam exec --
PNPM := pnpm

# OCaml paths
OCAML_STDLIB := $(shell ocamlc -where)

# WASI compilation flags for dynamic/relocatable modules
# -fPIC: Position Independent Code (required for dynamic loading)
# --target=wasm32-wasi: Target WASI
# -fvisibility=default: Export all symbols by default
WASI_CFLAGS := --target=wasm32-wasi --sysroot=$(WASI_SYSROOT) -fPIC -fvisibility=default -O2
WASI_LDFLAGS := -L$(WASI_SYSROOT)/lib/wasm32-wasi

# Number of parallel jobs
NPROC := $(shell nproc 2>/dev/null || echo 4)

#==============================================================================
# Main targets
#==============================================================================

all: ocaml wasm ts summary

help:
	@echo "MOPSA WASM Build System (WASI-SDK)"
	@echo ""
	@echo "Main targets:"
	@echo "  all      - Build everything (default)"
	@echo "  ocaml    - Build OCaml bytecode"
	@echo "  wasm     - Build WASM stubs"
	@echo "  ts       - Build TypeScript"
	@echo "  clean    - Clean build artifacts"
	@echo "  serve    - Start demo server on port 8080"
	@echo ""
	@echo "Environment:"
	@echo "  WASI_SDK_PATH - Path to wasi-sdk (default: /opt/wasi-sdk)"
	@echo ""
	@echo "Build order: ocaml -> wasm -> ts"

#==============================================================================
# Environment check (optional)
#==============================================================================

check-env:
	@echo "Checking environment..."
	@echo "OCaml: $$(ocamlc -version)"
	@echo "Node.js: $$(node -v)"
	@echo "pnpm: $$(pnpm -v)"
	@echo ""
	@echo "WASI SDK path: $(WASI_SDK_PATH)"
	@if [ -d "$(WASI_SDK_PATH)" ]; then \
		echo "  clang: $$($(WASI_CC) --version 2>&1 | head -1)"; \
		echo "  wasm-ld: $$($(WASI_LD) --version 2>&1 | head -1)"; \
	else \
		echo "  WARNING: WASI SDK not found!"; \
		echo "  Install from: https://github.com/WebAssembly/wasi-sdk/releases"; \
		echo "  Or set WASI_SDK_PATH environment variable"; \
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

# Build MOPSA-specific stubs using WASI-SDK
# These are built as WASM modules for dynamic loading by wasi-kernel
#
# LINKAGE NOTES:
# - --no-entry: No _start function (library, not executable)
# - --export-all: Export all defined symbols for dynamic loading
# - --allow-undefined-file: Allow undefined symbols (resolved at runtime by OCaml/JS)

# File to list allowed undefined symbols for WASM stubs
WASM_IMPORTS := backend/wasm/wasm_imports.txt

# Use stub implementation of floats_round.c for WASI
# (WASI doesn't support fenv.h rounding mode control)
$(DIST_DIR)/dllmopsa_utils_stubs.wasm: backend/wasm/floats_round_stubs.c $(WASM_IMPORTS)
	@echo "Building dllmopsa_utils_stubs.wasm with WASI-SDK (stub version)..."
	@mkdir -p $(DIST_DIR) $(BUILD_DIR)
	$(WASI_CC) $(WASI_CFLAGS) -c \
		-I$(OCAML_STDLIB) \
		-o $(BUILD_DIR)/floats_round_stubs.wasi.o \
		backend/wasm/floats_round_stubs.c
	$(WASI_LD) \
		--no-entry \
		--export-all \
		--allow-undefined-file=$(WASM_IMPORTS) \
		-o $(DIST_DIR)/dllmopsa_utils_stubs.wasm \
		$(BUILD_DIR)/floats_round_stubs.wasi.o

$(DIST_DIR)/dllmopsa_c_parser_stubs.wasm: backend/wasm/c_parser_stubs.c $(WASM_IMPORTS)
	@echo "Building dllmopsa_c_parser_stubs.wasm with WASI-SDK..."
	@mkdir -p $(DIST_DIR) $(BUILD_DIR)
	$(WASI_CC) $(WASI_CFLAGS) -c \
		-I$(OCAML_STDLIB) \
		-o $(BUILD_DIR)/c_parser_stubs.wasi.o \
		backend/wasm/c_parser_stubs.c
	$(WASI_LD) \
		--no-entry \
		--export-all \
		--allow-undefined-file=$(WASM_IMPORTS) \
		-o $(DIST_DIR)/dllmopsa_c_parser_stubs.wasm \
		$(BUILD_DIR)/c_parser_stubs.wasi.o

# Build stub GMP/MPFR/Apron library for minimal MOPSA
$(DIST_DIR)/dllgmp_caml.wasm: backend/wasm/gmp_all_stubs.c $(WASM_IMPORTS)
	@echo "Building stub GMP/MPFR/Apron library with WASI-SDK..."
	@mkdir -p $(DIST_DIR) $(BUILD_DIR)
	$(WASI_CC) $(WASI_CFLAGS) -c \
		-I$(OCAML_STDLIB) \
		-I$(shell opam var lib)/camlidl \
		-o $(BUILD_DIR)/gmp_all_stubs.wasi.o \
		backend/wasm/gmp_all_stubs.c
	$(WASI_LD) \
		--no-entry \
		--export-all \
		--allow-undefined-file=$(WASM_IMPORTS) \
		-o $(DIST_DIR)/dllgmp_caml.wasm \
		$(BUILD_DIR)/gmp_all_stubs.wasi.o
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


