/**
 * Main Clang Parser ML Replacement
 * 
 * This module provides the JavaScript implementation of mlclang_parse
 * that converts Clang JSON AST to OCaml AST values.
 * 
 * OCaml Type (from Clang_parser.ml):
 * 
 * type parse_result = {
 *   parse_decl: decl;           (* AST root *)
 *   parse_diag: diagnostic list; (* Warnings and errors *)
 *   parse_comments: comment list; (* C/C++ comments *)
 *   parse_macros: macro list;    (* Macros *)
 *   parse_files: string list;    (* Files read during parsing *)
 * }
 */

import type { ASTNode } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_emptylist,
    caml_alloc_tuple,
    Store_field,
} from './ocaml_values';
import { LocationTranslator } from './location_translator';
import { TypeTranslator } from './type_translator';
import { DeclTranslator } from './decl_translator';
import { StmtTranslator } from './stmt_translator';
import { ExprTranslator } from './expr_translator';

// ============================================================================
// Parse Result Builder
// ============================================================================

/**
 * ClangParserML - Converts Clang JSON AST to OCaml parse_result.
 */
export class ClangParserML {
    private locTranslator: LocationTranslator;
    private typeTranslator: TypeTranslator;
    private declTranslator: DeclTranslator;
    private stmtTranslator: StmtTranslator;
    private exprTranslator: ExprTranslator;
    
    constructor() {
        // Create translators
        this.locTranslator = new LocationTranslator();
        this.typeTranslator = new TypeTranslator();
        this.declTranslator = new DeclTranslator(this.locTranslator, this.typeTranslator);
        this.stmtTranslator = new StmtTranslator(this.locTranslator);
        this.exprTranslator = new ExprTranslator(this.locTranslator, this.typeTranslator);
        
        // Wire up cross-dependencies
        this.declTranslator.setExprTranslator((node) => this.exprTranslator.translateExpr(node));
        this.declTranslator.setStmtTranslator((node) => this.stmtTranslator.translateStmt(node));
        this.stmtTranslator.setDeclTranslator((node) => this.declTranslator.translateDecl(node));
        this.stmtTranslator.setExprTranslator((node) => this.exprTranslator.translateExpr(node));
        this.exprTranslator.setDeclTranslator((node) => this.declTranslator.translateDecl(node));
        this.exprTranslator.setStmtTranslator((node) => this.stmtTranslator.translateStmt(node));
    }
    
    /**
     * Parse JSON AST and create OCaml parse_result.
     * 
     * @param jsonAst - The parsed JSON AST from Clang
     * @param filename - The source file name
     * @returns OCaml parse_result tuple
     */
    parseJsonAst(jsonAst: ASTNode, filename: string): OcamlBlock {
        // Reset location context
        this.locTranslator.resetContext(filename);
        
        // Translate the root TranslationUnitDecl
        const rootDecl = this.declTranslator.translateDecl(jsonAst);
        
        // Create the 5-tuple parse_result
        const result = caml_alloc_tuple(5);
        
        // Field 0: parse_decl (the AST root)
        Store_field(result, 0, rootDecl);
        
        // Field 1: parse_diag (diagnostics - empty list for now)
        Store_field(result, 1, Val_emptylist);
        
        // Field 2: parse_comments (comments - empty list for now)
        Store_field(result, 2, Val_emptylist);
        
        // Field 3: parse_macros (macros - empty list for now)
        Store_field(result, 3, Val_emptylist);
        
        // Field 4: parse_files (files)
        Store_field(result, 4, this.locTranslator.getFiles());
        
        return result;
    }
    
    /**
     * Parse JSON string and create OCaml parse_result.
     * 
     * @param jsonString - The JSON AST string from Clang
     * @param filename - The source file name
     * @returns OCaml parse_result tuple
     */
    parseJsonString(jsonString: string, filename: string): OcamlBlock {
        const jsonAst = JSON.parse(jsonString) as ASTNode;
        return this.parseJsonAst(jsonAst, filename);
    }
}

// ============================================================================
// Global Parser Instance
// ============================================================================

let globalParser: ClangParserML | null = null;

/**
 * Get or create the global parser instance.
 */
function getParser(): ClangParserML {
    if (!globalParser) {
        globalParser = new ClangParserML();
    }
    return globalParser;
}

/**
 * Reset the global parser (useful for testing).
 */
export function resetParser(): void {
    globalParser = null;
}

/**
 * Main entry point for mlclang_parse replacement.
 * This function is called from the OCaml runtime.
 */
export function mlclang_parse_json(jsonString: string, filename: string): OcamlValue {
    console.log('[mlclang_parse_json] Starting parse for:', filename);
    console.log('[mlclang_parse_json] JSON length:', jsonString.length);

    const parser = getParser();
    const result = parser.parseJsonString(jsonString, filename);

    console.log('[mlclang_parse_json] Parse result:', result);
    console.log('[mlclang_parse_json] Result type:', typeof result);
    console.log('[mlclang_parse_json] Result is array:', Array.isArray(result));
    if (Array.isArray(result)) {
        console.log('[mlclang_parse_json] Result length:', result.length);
        console.log('[mlclang_parse_json] Result[0] (tag):', result[0]);
        console.log('[mlclang_parse_json] Result[1] (parse_decl):', result[1]);
        console.log('[mlclang_parse_json] Result[2] (parse_diag):', result[2]);
        console.log('[mlclang_parse_json] Result[3] (parse_comments):', result[3]);
        console.log('[mlclang_parse_json] Result[4] (parse_macros):', result[4]);
        console.log('[mlclang_parse_json] Result[5] (parse_files):', result[5]);
    }

    return result;
}

