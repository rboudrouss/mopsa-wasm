pas sûr que ça marche ctypes

# -> ctypes-example

ctypes_stubs_js pas complet

ctypes est pas magique, il y a encore de la configuration à faire 

cf semgrep (utilise des librairies purement C puis )

# -> ocaml-wasm

cf coq runtime

compiler mopsa ou juste intvutils/clang_to_ocaml en bytecode avec opt puis utiliser ocamlrun en wasm coté navigateur

clang -flto : dans le .a garde le bytecode llvm & le .o native

llvm-dis .o : works ont llvm .o files only 

rapport raconter le processus de travail : parallèle.