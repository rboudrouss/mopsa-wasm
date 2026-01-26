/**
 * Expression Translator
 * 
 * Converts Clang JSON expression nodes to OCaml expr values.
 * 
 * OCaml Types (from Clang_AST.ml):
 * 
 * type expr = {
 *   expr_kind: expr_kind;
 *   expr_type: type_qual;
 *   expr_range: range;
 * }
 * 
 * type expr_kind =
 *   | IntegerLiteral of Z.t
 *   | FloatingLiteral of string
 *   | CharacterLiteral of int32 * character_kind
 *   | StringLiteral of string * character_kind
 *   | BinaryOperator of expr * binary_operator * expr
 *   | UnaryOperator of unary_operator * expr
 *   | DeclRefExpr of decl
 *   | CallExpr of call_expr
 *   | CastExpr of expr * cast_kind
 *   | MemberExpr of member_expr
 *   | ParenExpr of expr
 *   | ...
 */

import type { ASTNode, QualType } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_int,
    Val_bool,
    Val_option,
    Val_array,
    Val_Z_from_string,
    caml_alloc,
    caml_alloc_tuple,
    caml_copy_string,
    Store_field,
    TranslationCache,
} from './ocaml_values';
import * as Tags from './clang_ast_tags';
import { LocationTranslator } from './location_translator';
import { TypeTranslator } from './type_translator';

// ============================================================================
// Expression Translator Class
// ============================================================================

export class ExprTranslator {
    /** Cache for expressions */
    private exprCache = new TranslationCache<string>();
    
    /** Location translator */
    private locTranslator: LocationTranslator;
    
    /** Type translator */
    private typeTranslator: TypeTranslator;
    
    /** Declaration translator function */
    private translateDeclFn?: (node: ASTNode) => OcamlValue;
    
    /** Statement translator function */
    private translateStmtFn?: (node: ASTNode) => OcamlValue;
    
    constructor(locTranslator: LocationTranslator, typeTranslator: TypeTranslator) {
        this.locTranslator = locTranslator;
        this.typeTranslator = typeTranslator;
    }
    
    /**
     * Set the declaration translator function.
     */
    setDeclTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateDeclFn = fn;
    }
    
    /**
     * Set the statement translator function.
     */
    setStmtTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateStmtFn = fn;
    }
    
    /**
     * Create the main expr record wrapper.
     * 
     * OCaml type: { expr_kind; expr_type; expr_range }
     */
    private createExprRecord(kind: OcamlValue, node: ASTNode): OcamlBlock {
        const block = caml_alloc_tuple(3);
        Store_field(block, 0, kind);  // expr_kind
        
        // expr_type
        const exprType = (node as ASTNode & { type?: QualType }).type;
        Store_field(block, 1, this.typeTranslator.translateQualType(exprType?.qualType));
        
        // expr_range
        Store_field(block, 2, this.locTranslator.translateRange(node.range));
        
        return block;
    }
    
    /**
     * Main expression translation method.
     */
    translateExpr(node: ASTNode): OcamlValue {
        if (!node) {
            throw new TypeError('translateExpr: null node');
        }
        
        // Check cache first
        const cached = this.exprCache.get(node.id);
        if (cached !== undefined) {
            return cached;
        }
        
        // Dispatch based on node kind
        switch (node.kind) {
            case 'IntegerLiteral':
                return this.translateIntegerLiteral(node);
            case 'FloatingLiteral':
                return this.translateFloatingLiteral(node);
            case 'CharacterLiteral':
                return this.translateCharacterLiteral(node);
            case 'StringLiteral':
                return this.translateStringLiteral(node);
            case 'BinaryOperator':
                return this.translateBinaryOperator(node);
            case 'CompoundAssignOperator':
                return this.translateCompoundAssignOperator(node);
            case 'UnaryOperator':
                return this.translateUnaryOperator(node);
            case 'DeclRefExpr':
                return this.translateDeclRefExpr(node);
            case 'CallExpr':
                return this.translateCallExpr(node);
            case 'ImplicitCastExpr':
            case 'CStyleCastExpr':
            case 'CXXStaticCastExpr':
            case 'CXXDynamicCastExpr':
            case 'CXXReinterpretCastExpr':
            case 'CXXConstCastExpr':
                return this.translateCastExpr(node);
            case 'MemberExpr':
                return this.translateMemberExpr(node);
            case 'ArraySubscriptExpr':
                return this.translateArraySubscriptExpr(node);
            case 'ParenExpr':
                return this.translateParenExpr(node);
            case 'ConditionalOperator':
                return this.translateConditionalOperator(node);
            case 'InitListExpr':
                return this.translateInitListExpr(node);
            case 'ImplicitValueInitExpr':
                return this.translateImplicitValueInitExpr(node);
            case 'ConstantExpr':
            case 'FullExpr':
                return this.translateWrappedExpr(node);
            default:
                return this.translateUnknownExpr(node);
        }
    }

    /**
     * Translate IntegerLiteral.
     */
    private translateIntegerLiteral(node: ASTNode): OcamlBlock {
        const litNode = node as ASTNode & { value?: string };
        const kind = caml_alloc(1, Tags.MLTAG_IntegerLiteral);
        // Create proper Z.t value using ml_z_of_substring_base via Val_Z_from_string
        Store_field(kind, 0, Val_Z_from_string(litNode.value ?? '0', 10));

        const result = this.createExprRecord(kind, node);
        this.exprCache.set(node.id, result);
        return result;
    }

    /**
     * Translate FloatingLiteral.
     */
    private translateFloatingLiteral(node: ASTNode): OcamlBlock {
        const litNode = node as ASTNode & { value?: string };
        const kind = caml_alloc(1, Tags.MLTAG_FloatingLiteral);
        Store_field(kind, 0, caml_copy_string(litNode.value ?? '0.0'));

        const result = this.createExprRecord(kind, node);
        this.exprCache.set(node.id, result);
        return result;
    }

    /**
     * Translate CharacterLiteral.
     */
    private translateCharacterLiteral(node: ASTNode): OcamlBlock {
        const litNode = node as ASTNode & { value?: number };
        const kind = caml_alloc(2, Tags.MLTAG_CharacterLiteral);
        Store_field(kind, 0, Val_int(litNode.value ?? 0));  // Int32
        Store_field(kind, 1, Val_int(Tags.MLTAG_Char_Ascii));  // character_kind

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate StringLiteral.
     */
    private translateStringLiteral(node: ASTNode): OcamlBlock {
        const litNode = node as ASTNode & { value?: string };
        const kind = caml_alloc(2, Tags.MLTAG_StringLiteral);
        Store_field(kind, 0, caml_copy_string(litNode.value ?? ''));
        Store_field(kind, 1, Val_int(Tags.MLTAG_Char_Ascii));  // character_kind

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate BinaryOperator.
     */
    private translateBinaryOperator(node: ASTNode): OcamlBlock {
        const binNode = node as ASTNode & { opcode?: string };
        const children = node.inner ?? [];

        const kind = caml_alloc(3, Tags.MLTAG_BinaryOperator);

        // Left operand
        if (children[0]) {
            Store_field(kind, 0, this.translateExpr(children[0]));
        } else {
            Store_field(kind, 0, Val_int(0));
        }

        // Operator
        Store_field(kind, 1, Val_int(this.translateBinaryOpcode(binNode.opcode)));

        // Right operand
        if (children[1]) {
            Store_field(kind, 2, this.translateExpr(children[1]));
        } else {
            Store_field(kind, 2, Val_int(0));
        }

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate binary operator opcode to OCaml tag.
     */
    private translateBinaryOpcode(opcode: string | undefined): number {
        const opcodeMap: Record<string, number> = {
            '*': Tags.MLTAG_BO_Mul,
            '/': Tags.MLTAG_BO_Div,
            '%': Tags.MLTAG_BO_Rem,
            '+': Tags.MLTAG_BO_Add,
            '-': Tags.MLTAG_BO_Sub,
            '<<': Tags.MLTAG_BO_Shl,
            '>>': Tags.MLTAG_BO_Shr,
            '<': Tags.MLTAG_BO_LT,
            '>': Tags.MLTAG_BO_GT,
            '<=': Tags.MLTAG_BO_LE,
            '>=': Tags.MLTAG_BO_GE,
            '==': Tags.MLTAG_BO_EQ,
            '!=': Tags.MLTAG_BO_NE,
            '&': Tags.MLTAG_BO_And,
            '^': Tags.MLTAG_BO_Xor,
            '|': Tags.MLTAG_BO_Or,
            '&&': Tags.MLTAG_BO_LAnd,
            '||': Tags.MLTAG_BO_LOr,
            '=': Tags.MLTAG_BO_Assign,
            ',': Tags.MLTAG_BO_Comma,
        };
        return opcodeMap[opcode ?? ''] ?? Tags.MLTAG_BO_Add;
    }

    /**
     * Translate CompoundAssignOperator (+=, -=, etc.).
     */
    private translateCompoundAssignOperator(node: ASTNode): OcamlBlock {
        const binNode = node as ASTNode & { opcode?: string; computationLHSType?: QualType; computationResultType?: QualType };
        const children = node.inner ?? [];

        // compound_assign_expr has 5 fields
        const compoundExpr = caml_alloc_tuple(5);

        // LHS
        if (children[0]) {
            Store_field(compoundExpr, 0, this.translateExpr(children[0]));
        } else {
            Store_field(compoundExpr, 0, Val_int(0));
        }

        // computation LHS type
        Store_field(compoundExpr, 1, this.typeTranslator.translateQualType(binNode.computationLHSType?.qualType));

        // Operator
        Store_field(compoundExpr, 2, Val_int(this.translateCompoundOpcode(binNode.opcode)));

        // RHS
        if (children[1]) {
            Store_field(compoundExpr, 3, this.translateExpr(children[1]));
        } else {
            Store_field(compoundExpr, 3, Val_int(0));
        }

        // computation result type
        Store_field(compoundExpr, 4, this.typeTranslator.translateQualType(binNode.computationResultType?.qualType));

        const kind = caml_alloc(1, Tags.MLTAG_CompoundAssignOperator);
        Store_field(kind, 0, compoundExpr);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate compound assignment opcode.
     */
    private translateCompoundOpcode(opcode: string | undefined): number {
        const opcodeMap: Record<string, number> = {
            '*=': Tags.MLTAG_BO_MulAssign,
            '/=': Tags.MLTAG_BO_DivAssign,
            '%=': Tags.MLTAG_BO_RemAssign,
            '+=': Tags.MLTAG_BO_AddAssign,
            '-=': Tags.MLTAG_BO_SubAssign,
            '<<=': Tags.MLTAG_BO_ShlAssign,
            '>>=': Tags.MLTAG_BO_ShrAssign,
            '&=': Tags.MLTAG_BO_AndAssign,
            '^=': Tags.MLTAG_BO_XorAssign,
            '|=': Tags.MLTAG_BO_OrAssign,
        };
        return opcodeMap[opcode ?? ''] ?? Tags.MLTAG_BO_AddAssign;
    }

    /**
     * Translate UnaryOperator.
     */
    private translateUnaryOperator(node: ASTNode): OcamlBlock {
        const unaryNode = node as ASTNode & { opcode?: string };
        const child = node.inner?.[0];

        const kind = caml_alloc(2, Tags.MLTAG_UnaryOperator);

        // Operator
        Store_field(kind, 0, Val_int(this.translateUnaryOpcode(unaryNode.opcode)));

        // Operand
        if (child) {
            Store_field(kind, 1, this.translateExpr(child));
        } else {
            Store_field(kind, 1, Val_int(0));
        }

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate unary operator opcode to OCaml tag.
     */
    private translateUnaryOpcode(opcode: string | undefined): number {
        const opcodeMap: Record<string, number> = {
            '++': Tags.MLTAG_UO_PreInc,
            '--': Tags.MLTAG_UO_PreDec,
            '&': Tags.MLTAG_UO_AddrOf,
            '*': Tags.MLTAG_UO_Deref,
            '+': Tags.MLTAG_UO_Plus,
            '-': Tags.MLTAG_UO_Minus,
            '~': Tags.MLTAG_UO_Not,
            '!': Tags.MLTAG_UO_LNot,
        };
        return opcodeMap[opcode ?? ''] ?? Tags.MLTAG_UO_Plus;
    }

    /**
     * Translate DeclRefExpr - reference to a declaration.
     */
    private translateDeclRefExpr(node: ASTNode): OcamlBlock {
        const refNode = node as ASTNode & { referencedDecl?: { id: string; kind: string; name?: string } };

        const kind = caml_alloc(1, Tags.MLTAG_DeclRefExpr);

        if (refNode.referencedDecl && this.translateDeclFn) {
            // Need to translate the referenced declaration
            Store_field(kind, 0, this.translateDeclFn(refNode.referencedDecl as ASTNode));
        } else {
            Store_field(kind, 0, Val_int(0));
        }

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate CallExpr - function call.
     */
    private translateCallExpr(node: ASTNode): OcamlBlock {
        const children = node.inner ?? [];

        // call_expr has 4 fields: callee, direct_callee_opt, args, overloaded_op_opt
        const callExpr = caml_alloc_tuple(4);

        // Callee (first child)
        if (children[0]) {
            Store_field(callExpr, 0, this.translateExpr(children[0]));
        } else {
            Store_field(callExpr, 0, Val_int(0));
        }

        // Direct callee (optional) - we'll leave this as None for simplicity
        Store_field(callExpr, 1, Val_int(0));  // None

        // Arguments (remaining children)
        const args = children.slice(1);
        Store_field(callExpr, 2, Val_array(args, (arg) => this.translateExpr(arg)));

        // Overloaded operator (C++) - None for C
        Store_field(callExpr, 3, Val_int(0));  // None

        const kind = caml_alloc(1, Tags.MLTAG_CallExpr);
        Store_field(kind, 0, callExpr);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate CastExpr - type cast.
     */
    private translateCastExpr(node: ASTNode): OcamlBlock {
        const child = node.inner?.[0];

        const kind = caml_alloc(2, Tags.MLTAG_CastExpr);

        // Sub-expression
        if (child) {
            Store_field(kind, 0, this.translateExpr(child));
        } else {
            Store_field(kind, 0, Val_int(0));
        }

        // Cast kind
        let castKind: number;
        switch (node.kind) {
            case 'CStyleCastExpr':
                castKind = Tags.MLTAG_CStyleCast;
                break;
            case 'CXXFunctionalCastExpr':
                castKind = Tags.MLTAG_CXXFunctionalCast;
                break;
            case 'CXXConstCastExpr':
                castKind = Tags.MLTAG_CXXConstCast;
                break;
            case 'CXXDynamicCastExpr':
                castKind = Tags.MLTAG_CXXDynamicCast;
                break;
            case 'CXXReinterpretCastExpr':
                castKind = Tags.MLTAG_CXXReinterpretCast;
                break;
            case 'CXXStaticCastExpr':
                castKind = Tags.MLTAG_CXXStaticCast;
                break;
            case 'ImplicitCastExpr':
            default:
                castKind = Tags.MLTAG_ImplicitCast;
                break;
        }
        Store_field(kind, 1, Val_int(castKind));

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate MemberExpr - struct/union member access.
     */
    private translateMemberExpr(node: ASTNode): OcamlBlock {
        const memberNode = node as ASTNode & {
            isArrow?: boolean;
            referencedMemberDecl?: string;
            name?: string;
        };
        const child = node.inner?.[0];

        // member_expr has 6 fields: base, member_decl, is_arrow, qualifier_opt, template_args, member_name
        const memberExpr = caml_alloc_tuple(6);

        // Base expression
        if (child) {
            Store_field(memberExpr, 0, this.translateExpr(child));
        } else {
            Store_field(memberExpr, 0, Val_int(0));
        }

        // Member declaration - for now create a minimal placeholder
        Store_field(memberExpr, 1, Val_int(0));  // TODO: proper decl

        // Is arrow (->)
        Store_field(memberExpr, 2, Val_bool(memberNode.isArrow ?? false));

        // Qualifier (optional) - None
        Store_field(memberExpr, 3, Val_int(0));

        // Template arguments - empty array
        Store_field(memberExpr, 4, Val_array([], () => Val_int(0)));

        // Member name
        Store_field(memberExpr, 5, this.translateDeclarationName(memberNode.name ?? ''));

        const kind = caml_alloc(1, Tags.MLTAG_MemberExpr);
        Store_field(kind, 0, memberExpr);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate a declaration name.
     * DeclarationName is a variant type with Identifier being the common case for C.
     */
    private translateDeclarationName(name: string): OcamlBlock {
        // Identifier(string) - tag 0 with 1 field
        const block = caml_alloc(1, Tags.MLTAG_Identifier);
        Store_field(block, 0, caml_copy_string(name));
        return block;
    }

    /**
     * Translate ArraySubscriptExpr - array indexing.
     */
    private translateArraySubscriptExpr(node: ASTNode): OcamlBlock {
        const children = node.inner ?? [];

        // array_subscript_expr has 2 fields: base, index
        const arrExpr = caml_alloc_tuple(2);

        // Base
        if (children[0]) {
            Store_field(arrExpr, 0, this.translateExpr(children[0]));
        } else {
            Store_field(arrExpr, 0, Val_int(0));
        }

        // Index
        if (children[1]) {
            Store_field(arrExpr, 1, this.translateExpr(children[1]));
        } else {
            Store_field(arrExpr, 1, Val_int(0));
        }

        const kind = caml_alloc(1, Tags.MLTAG_ArraySubscriptExpr);
        Store_field(kind, 0, arrExpr);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate ParenExpr - parenthesized expression.
     */
    private translateParenExpr(node: ASTNode): OcamlBlock {
        const child = node.inner?.[0];

        const kind = caml_alloc(1, Tags.MLTAG_ParenExpr);

        if (child) {
            Store_field(kind, 0, this.translateExpr(child));
        } else {
            Store_field(kind, 0, Val_int(0));
        }

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate ConditionalOperator - ternary operator (?:).
     */
    private translateConditionalOperator(node: ASTNode): OcamlBlock {
        const children = node.inner ?? [];

        // conditional_operator has 3 fields: cond, true_expr, false_expr
        const condExpr = caml_alloc_tuple(3);

        // Condition
        if (children[0]) {
            Store_field(condExpr, 0, this.translateExpr(children[0]));
        } else {
            Store_field(condExpr, 0, Val_int(0));
        }

        // True branch
        if (children[1]) {
            Store_field(condExpr, 1, this.translateExpr(children[1]));
        } else {
            Store_field(condExpr, 1, Val_int(0));
        }

        // False branch
        if (children[2]) {
            Store_field(condExpr, 2, this.translateExpr(children[2]));
        } else {
            Store_field(condExpr, 2, Val_int(0));
        }

        const kind = caml_alloc(1, Tags.MLTAG_ConditionalOperator);
        Store_field(kind, 0, condExpr);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate InitListExpr - initializer list.
     */
    private translateInitListExpr(node: ASTNode): OcamlBlock {
        const children = node.inner ?? [];
        const initNode = node as ASTNode & { arrayFiller?: ASTNode };

        // init_list_expr has 3 fields: inits, union_field_opt, array_filler_opt
        const initList = caml_alloc_tuple(3);

        // Initializers
        Store_field(initList, 0, Val_array(children, (child) => this.translateExpr(child)));

        // Union initialized field (optional) - None
        Store_field(initList, 1, Val_int(0));

        // Array filler (optional)
        if (initNode.arrayFiller) {
            Store_field(initList, 2, Val_option(this.translateExpr(initNode.arrayFiller), (v) => v));
        } else {
            Store_field(initList, 2, Val_int(0));
        }

        const kind = caml_alloc(1, Tags.MLTAG_InitListExpr);
        Store_field(kind, 0, initList);

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate ImplicitValueInitExpr - implicit value initialization.
     */
    private translateImplicitValueInitExpr(node: ASTNode): OcamlBlock {
        const kind = Val_int(Tags.MLTAG_ImplicitValueInitExpr);
        return this.createExprRecord(kind, node);
    }

    /**
     * Translate wrapped expressions (ConstantExpr, FullExpr).
     */
    private translateWrappedExpr(node: ASTNode): OcamlBlock {
        const child = node.inner?.[0];

        const tag = node.kind === 'ConstantExpr'
            ? Tags.MLTAG_ConstantExpr
            : Tags.MLTAG_FullExpr;

        const kind = caml_alloc(1, tag);

        if (child) {
            Store_field(kind, 0, this.translateExpr(child));
        } else {
            Store_field(kind, 0, Val_int(0));
        }

        return this.createExprRecord(kind, node);
    }

    /**
     * Translate unknown expression - fallback.
     */
    private translateUnknownExpr(node: ASTNode): OcamlBlock {
        // For unknown expressions, if they have a child, try to translate it
        // Otherwise create a placeholder
        const child = node.inner?.[0];

        if (child) {
            // Cast is safe since expressions are always blocks
            return this.translateExpr(child) as OcamlBlock;
        }

        // Create a placeholder integer literal with value 0
        const kind = caml_alloc(1, Tags.MLTAG_IntegerLiteral);
        Store_field(kind, 0, caml_copy_string('0'));

        return this.createExprRecord(kind, node);
    }
}
