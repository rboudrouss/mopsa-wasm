/**
 * Statement Translator
 * 
 * Converts Clang JSON statement nodes to OCaml stmt values.
 * 
 * OCaml Types (from Clang_AST.ml):
 * 
 * type stmt = {
 *   stmt_kind: stmt_kind;
 *   stmt_range: range;
 * }
 * 
 * type stmt_kind =
 *   | AsmStmt of asm_stmt
 *   | AttributedStmt of stmt * (attr list)
 *   | BreakStmt of loc
 *   | CompoundStmt of stmt list
 *   | ContinueStmt of loc
 *   | DeclStmt of decl list
 *   | DoStmt of do_stmt
 *   | ExprStmt of expr
 *   | ForStmt of for_stmt
 *   | GotoStmt of name * loc
 *   | IfStmt of if_stmt
 *   | IndirectGotoStmt of expr * name option
 *   | LabelStmt of name * stmt
 *   | NullStmt
 *   | ReturnStmt of expr option
 *   | CaseStmt of case_stmt
 *   | DefaultStmt of stmt
 *   | SwitchStmt of switch_stmt
 *   | WhileStmt of while_stmt
 *   | ...
 */

import type { ASTNode, DeclNode } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_int,
    Val_option,
    Val_list,
    caml_alloc,
    caml_alloc_tuple,
    caml_copy_string,
    Store_field,
    TranslationCache,
} from './ocaml_values';
import * as Tags from './clang_ast_tags';
import { LocationTranslator } from './location_translator';

// ============================================================================
// Statement Translator Class
// ============================================================================

export class StmtTranslator {
    /** Cache for statements */
    private stmtCache = new TranslationCache<string>();
    
    /** Location translator */
    private locTranslator: LocationTranslator;
    
    /** Declaration translator function */
    private translateDeclFn?: (node: ASTNode) => OcamlValue;
    
    /** Expression translator function */
    private translateExprFn?: (node: ASTNode) => OcamlValue;
    
    constructor(locTranslator: LocationTranslator) {
        this.locTranslator = locTranslator;
    }
    
    /**
     * Set the declaration translator function.
     */
    setDeclTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateDeclFn = fn;
    }
    
    /**
     * Set the expression translator function.
     */
    setExprTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateExprFn = fn;
    }
    
    /**
     * Create the main stmt record wrapper.
     * 
     * OCaml type: { stmt_kind; stmt_range }
     */
    private createStmtRecord(kind: OcamlValue, node: ASTNode): OcamlBlock {
        const block = caml_alloc_tuple(2);
        Store_field(block, 0, kind);  // stmt_kind
        Store_field(block, 1, this.locTranslator.translateRange(node.range));  // stmt_range
        return block;
    }
    
    /**
     * Main statement translation method.
     */
    translateStmt(node: ASTNode): OcamlValue {
        if (!node) {
            throw new TypeError('translateStmt: null node');
        }
        
        // Check cache first
        const cached = this.stmtCache.get(node.id);
        if (cached !== undefined) {
            return cached;
        }
        
        // Dispatch based on node kind
        switch (node.kind) {
            case 'CompoundStmt':
                return this.translateCompoundStmt(node);
            case 'DeclStmt':
                return this.translateDeclStmt(node);
            case 'ReturnStmt':
                return this.translateReturnStmt(node);
            case 'IfStmt':
                return this.translateIfStmt(node);
            case 'WhileStmt':
                return this.translateWhileStmt(node);
            case 'DoStmt':
                return this.translateDoStmt(node);
            case 'ForStmt':
                return this.translateForStmt(node);
            case 'BreakStmt':
                return this.translateBreakStmt(node);
            case 'ContinueStmt':
                return this.translateContinueStmt(node);
            case 'SwitchStmt':
                return this.translateSwitchStmt(node);
            case 'CaseStmt':
                return this.translateCaseStmt(node);
            case 'DefaultStmt':
                return this.translateDefaultStmt(node);
            case 'GotoStmt':
                return this.translateGotoStmt(node);
            case 'LabelStmt':
                return this.translateLabelStmt(node);
            case 'NullStmt':
                return this.translateNullStmt(node);
            default:
                // Most other nodes are expressions
                return this.translateExprStmt(node);
        }
    }

    /**
     * Translate CompoundStmt - a block of statements.
     */
    private translateCompoundStmt(node: ASTNode): OcamlBlock {
        const stmts: OcamlValue[] = [];

        if (node.inner) {
            for (const child of node.inner) {
                stmts.push(this.translateStmt(child));
            }
        }

        const kind = caml_alloc(1, Tags.MLTAG_CompoundStmt);
        Store_field(kind, 0, Val_list(stmts, (s) => s));

        const result = this.createStmtRecord(kind, node);
        this.stmtCache.set(node.id, result);
        return result;
    }

    /**
     * Translate DeclStmt - declaration in a statement context.
     */
    private translateDeclStmt(node: ASTNode): OcamlBlock {
        const decls: OcamlValue[] = [];

        if (node.inner && this.translateDeclFn) {
            for (const child of node.inner) {
                decls.push(this.translateDeclFn(child));
            }
        }

        const kind = caml_alloc(1, Tags.MLTAG_DeclStmt);
        Store_field(kind, 0, Val_list(decls, (d) => d));

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate ReturnStmt.
     */
    private translateReturnStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_ReturnStmt);

        // Return value is optional
        const retExpr = node.inner?.[0];
        if (retExpr && this.translateExprFn) {
            Store_field(kind, 0, Val_option(this.translateExprFn(retExpr), (v) => v));
        } else {
            Store_field(kind, 0, Val_int(0));  // None
        }

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate IfStmt.
     */
    private translateIfStmt(node: ASTNode): OcamlBlock {
        // if_stmt has 4 fields: cond_opt, then_opt, else_opt, init_opt
        const ifStmt = caml_alloc_tuple(4);

        // Find children - structure is [cond, then, ?else]
        const children = node.inner ?? [];

        // Condition
        const cond = children.find(c => c.kind !== 'CompoundStmt' && c.kind !== 'IfStmt');
        if (cond && this.translateExprFn) {
            Store_field(ifStmt, 0, Val_option(this.translateExprFn(cond), (v) => v));
        } else {
            Store_field(ifStmt, 0, Val_int(0));
        }

        // Then branch
        const thenBranch = children.find(c => c.kind === 'CompoundStmt' ||
            (children.indexOf(c) > 0 && c !== cond));
        if (thenBranch) {
            Store_field(ifStmt, 1, Val_option(this.translateStmt(thenBranch), (v) => v));
        } else {
            Store_field(ifStmt, 1, Val_int(0));
        }

        // Else branch (optional)
        const elseIdx = children.indexOf(thenBranch!) + 1;
        const elseBranch = elseIdx < children.length ? children[elseIdx] : undefined;
        if (elseBranch) {
            Store_field(ifStmt, 2, Val_option(this.translateStmt(elseBranch), (v) => v));
        } else {
            Store_field(ifStmt, 2, Val_int(0));
        }

        // Init (C++17) - not common in C
        Store_field(ifStmt, 3, Val_int(0));  // None

        const kind = caml_alloc(1, Tags.MLTAG_IfStmt);
        Store_field(kind, 0, ifStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate WhileStmt.
     */
    private translateWhileStmt(node: ASTNode): OcamlBlock {
        // while_stmt has 2 fields: cond, body
        const whileStmt = caml_alloc_tuple(2);

        const children = node.inner ?? [];
        const cond = children[0];
        const body = children[1];

        if (cond && this.translateExprFn) {
            Store_field(whileStmt, 0, this.translateExprFn(cond));
        } else {
            Store_field(whileStmt, 0, Val_int(0));
        }

        if (body) {
            Store_field(whileStmt, 1, this.translateStmt(body));
        } else {
            Store_field(whileStmt, 1, this.translateNullStmt(node));
        }

        const kind = caml_alloc(1, Tags.MLTAG_WhileStmt);
        Store_field(kind, 0, whileStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate DoStmt.
     */
    private translateDoStmt(node: ASTNode): OcamlBlock {
        // do_stmt has 2 fields: body, cond
        const doStmt = caml_alloc_tuple(2);

        const children = node.inner ?? [];
        const body = children[0];
        const cond = children[1];

        if (body) {
            Store_field(doStmt, 0, this.translateStmt(body));
        } else {
            Store_field(doStmt, 0, this.translateNullStmt(node));
        }

        if (cond && this.translateExprFn) {
            Store_field(doStmt, 1, this.translateExprFn(cond));
        } else {
            Store_field(doStmt, 1, Val_int(0));
        }

        const kind = caml_alloc(1, Tags.MLTAG_DoStmt);
        Store_field(kind, 0, doStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate ForStmt.
     */
    private translateForStmt(node: ASTNode): OcamlBlock {
        // for_stmt has 4 fields: init_opt, cond_opt, inc_opt, body
        const forStmt = caml_alloc_tuple(4);

        const children = node.inner ?? [];
        // For loop structure: init?, cond?, inc?, body
        // Clang uses NullStmt placeholders for missing parts

        let idx = 0;

        // Init (optional)
        if (children[idx] && children[idx].kind !== 'NullStmt') {
            Store_field(forStmt, 0, Val_option(this.translateStmt(children[idx]), (v) => v));
        } else {
            Store_field(forStmt, 0, Val_int(0));
        }
        idx++;

        // Condition (optional)
        if (children[idx] && children[idx].kind !== 'NullStmt' && this.translateExprFn) {
            Store_field(forStmt, 1, Val_option(this.translateExprFn(children[idx]), (v) => v));
        } else {
            Store_field(forStmt, 1, Val_int(0));
        }
        idx++;

        // Increment (optional)
        if (children[idx] && children[idx].kind !== 'NullStmt' && this.translateExprFn) {
            Store_field(forStmt, 2, Val_option(this.translateExprFn(children[idx]), (v) => v));
        } else {
            Store_field(forStmt, 2, Val_int(0));
        }
        idx++;

        // Body
        if (children[idx]) {
            Store_field(forStmt, 3, this.translateStmt(children[idx]));
        } else {
            Store_field(forStmt, 3, this.translateNullStmt(node));
        }

        const kind = caml_alloc(1, Tags.MLTAG_ForStmt);
        Store_field(kind, 0, forStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate BreakStmt.
     */
    private translateBreakStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_BreakStmt);
        Store_field(kind, 0, this.locTranslator.translateLoc(node.loc));
        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate ContinueStmt.
     */
    private translateContinueStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_ContinueStmt);
        Store_field(kind, 0, this.locTranslator.translateLoc(node.loc));
        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate SwitchStmt.
     */
    private translateSwitchStmt(node: ASTNode): OcamlBlock {
        // switch_stmt has 3 fields: init_opt, cond, body
        const switchStmt = caml_alloc_tuple(3);

        const children = node.inner ?? [];

        // Init (C++17) - usually not present in C
        Store_field(switchStmt, 0, Val_int(0));  // None

        // Condition
        if (children[0] && this.translateExprFn) {
            Store_field(switchStmt, 1, this.translateExprFn(children[0]));
        } else {
            Store_field(switchStmt, 1, Val_int(0));
        }

        // Body
        if (children[1]) {
            Store_field(switchStmt, 2, this.translateStmt(children[1]));
        } else {
            Store_field(switchStmt, 2, this.translateNullStmt(node));
        }

        const kind = caml_alloc(1, Tags.MLTAG_SwitchStmt);
        Store_field(kind, 0, switchStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate CaseStmt.
     */
    private translateCaseStmt(node: ASTNode): OcamlBlock {
        // case_stmt has 3 fields: lhs, rhs_opt, substmt
        const caseStmt = caml_alloc_tuple(3);

        const children = node.inner ?? [];

        // LHS (the case value)
        if (children[0] && this.translateExprFn) {
            Store_field(caseStmt, 0, this.translateExprFn(children[0]));
        } else {
            Store_field(caseStmt, 0, Val_int(0));
        }

        // RHS (for range case, e.g., case 1 ... 5) - usually None
        Store_field(caseStmt, 1, Val_int(0));  // None

        // Substatement
        const substmtIdx = children.length - 1;
        if (substmtIdx > 0 && children[substmtIdx]) {
            Store_field(caseStmt, 2, this.translateStmt(children[substmtIdx]));
        } else {
            Store_field(caseStmt, 2, this.translateNullStmt(node));
        }

        const kind = caml_alloc(1, Tags.MLTAG_CaseStmt);
        Store_field(kind, 0, caseStmt);

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate DefaultStmt.
     */
    private translateDefaultStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_DefaultStmt);

        const substmt = node.inner?.[0];
        if (substmt) {
            Store_field(kind, 0, this.translateStmt(substmt));
        } else {
            Store_field(kind, 0, this.translateNullStmt(node));
        }

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate GotoStmt.
     */
    private translateGotoStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(2, Tags.MLTAG_GotoStmt);

        // Label name - try to extract from children or node
        const labelName = this.extractLabelName(node);
        Store_field(kind, 0, this.translateName(labelName));

        // Label location
        Store_field(kind, 1, this.locTranslator.translateLoc(node.loc));

        return this.createStmtRecord(kind, node);
    }

    private extractLabelName(node: ASTNode): string {
        // Try to find label name in node or children
        const labelDecl = node.inner?.find(c => c.kind === 'LabelDecl');
        if (labelDecl) {
            return (labelDecl as DeclNode).name ?? '';
        }
        return '';
    }

    private translateName(name: string): OcamlBlock {
        const block = caml_alloc_tuple(3);
        Store_field(block, 0, caml_copy_string(name));
        Store_field(block, 1, caml_copy_string(name));
        Store_field(block, 2, Val_int(Tags.MLTAG_Identifier));
        return block;
    }

    /**
     * Translate LabelStmt.
     */
    private translateLabelStmt(node: ASTNode): OcamlBlock {
        const labelNode = node as ASTNode & { name?: string; declId?: string };

        const kind = caml_alloc(2, Tags.MLTAG_LabelStmt);

        // Label name
        Store_field(kind, 0, this.translateName(labelNode.name ?? ''));

        // Substatement
        const substmt = node.inner?.[0];
        if (substmt) {
            Store_field(kind, 1, this.translateStmt(substmt));
        } else {
            Store_field(kind, 1, this.translateNullStmt(node));
        }

        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate NullStmt.
     */
    private translateNullStmt(node: ASTNode): OcamlBlock {
        const kind = Val_int(Tags.MLTAG_NullStmt);
        return this.createStmtRecord(kind, node);
    }

    /**
     * Translate expression as statement.
     */
    private translateExprStmt(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_Expr);

        if (this.translateExprFn) {
            Store_field(kind, 0, this.translateExprFn(node));
        } else {
            // Create a placeholder
            Store_field(kind, 0, Val_int(0));
        }

        return this.createStmtRecord(kind, node);
    }
}

