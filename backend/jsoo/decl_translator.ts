/**
 * Declaration Translator
 * 
 * Converts Clang JSON declaration nodes to OCaml decl values.
 * 
 * OCaml Types (from Clang_AST.ml):
 * 
 * type decl = {
 *   decl_kind: decl_kind;
 *   decl_access: access_specifier;
 *   decl_range: range;
 *   decl_comment: comment list;
 *   decl_attrs: attr list;
 * }
 * 
 * type decl_kind =
 *   | TranslationUnitDecl of decl list
 *   | EmptyDecl
 *   | FieldDecl of field_decl
 *   | EnumConstantDecl of enum_cst_decl
 *   | FileScopeAsmDecl of string
 *   | LinkageSpecDecl of lang * decl list
 *   | LabelDecl of name
 *   | EnumDecl of enum_decl
 *   | RecordDecl of record_decl
 *   | TypedefDecl of typedef_decl
 *   | FunctionDecl of function_decl
 *   | VarDecl of var_decl
 *   | ... (C++ declarations)
 */

import type { ASTNode, DeclNode } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_int,
    Val_bool,
    Val_option,
    Val_list,
    Val_list_indexed,
    Val_array,
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
// Types
// ============================================================================

/** UID counter for declarations */
let uidCounter = 0;

/** Generate a unique ID for declarations */
function generateUid(): number {
    return uidCounter++;
}

/** Reset UID counter (call when starting new translation) */
export function resetUidCounter(): void {
    uidCounter = 0;
}

// ============================================================================
// Declaration Translator Class
// ============================================================================

export class DeclTranslator {
    /** Cache for declarations to handle sharing and cycles */
    private declCache = new TranslationCache<string>();
    
    /** Location translator */
    private locTranslator: LocationTranslator;
    
    /** Type translator */
    private typeTranslator: TypeTranslator;
    
    /** Node lookup by ID */
    private nodeById = new Map<string, ASTNode>();
    
    /** Expression translator (set later to avoid circular dependency) */
    private translateExprFn?: (node: ASTNode) => OcamlValue;
    
    /** Statement translator (set later to avoid circular dependency) */
    private translateStmtFn?: (node: ASTNode) => OcamlValue;
    
    constructor(locTranslator: LocationTranslator, typeTranslator: TypeTranslator) {
        this.locTranslator = locTranslator;
        this.typeTranslator = typeTranslator;
    }
    
    /**
     * Set the expression translator function (called after ExprTranslator is created).
     */
    setExprTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateExprFn = fn;
    }
    
    /**
     * Set the statement translator function (called after StmtTranslator is created).
     */
    setStmtTranslator(fn: (node: ASTNode) => OcamlValue): void {
        this.translateStmtFn = fn;
    }
    
    /**
     * Index all nodes by ID for cross-referencing.
     */
    indexNodes(root: ASTNode): void {
        const index = (node: ASTNode) => {
            if (node.id) {
                this.nodeById.set(node.id, node);
            }
            if (node.inner) {
                for (const child of node.inner) {
                    index(child);
                }
            }
        };
        index(root);
    }
    
    /**
     * Get a node by its ID.
     */
    getNodeById(id: string): ASTNode | undefined {
        return this.nodeById.get(id);
    }
    
    /**
     * Create OCaml name record.
     * 
     * OCaml type: { name_cstr: string; name_qualified: string; name_declaration: declaration_name }
     */
    translateName(name: string | undefined, qualifiedName?: string): OcamlBlock {
        const block = caml_alloc_tuple(3);
        const nameStr = name ?? '';
        Store_field(block, 0, caml_copy_string(nameStr));  // name_cstr
        Store_field(block, 1, caml_copy_string(qualifiedName ?? nameStr));  // name_qualified
        Store_field(block, 2, Val_int(Tags.MLTAG_Identifier));  // name_declaration: Identifier
        return block;
    }
    
    /**
     * Translate access specifier.
     */
    translateAccessSpecifier(node: ASTNode): number {
        // For C code, access is always AS_none
        return Tags.MLTAG_AS_none;
    }

    /**
     * Create the main decl record wrapper.
     *
     * OCaml type: { decl_kind; decl_access; decl_range; decl_comment; decl_attrs }
     */
    private createDeclRecord(kind: OcamlValue, node: ASTNode): OcamlBlock {
        const block = caml_alloc_tuple(5);
        Store_field(block, 0, kind);  // decl_kind
        Store_field(block, 1, Val_int(this.translateAccessSpecifier(node)));  // decl_access
        Store_field(block, 2, this.locTranslator.translateRange(node.range));  // decl_range
        Store_field(block, 3, 0);  // decl_comment: empty list
        Store_field(block, 4, 0);  // decl_attrs: empty list
        return block;
    }

    /**
     * Main declaration translation method.
     */
    translateDecl(node: ASTNode): OcamlValue {
        if (!node) {
            throw new TypeError('translateDecl: null node');
        }

        // Check cache first
        const cached = this.declCache.get(node.id);
        if (cached !== undefined) {
            return cached;
        }

        // Dispatch based on node kind
        switch (node.kind) {
            case 'TranslationUnitDecl':
                return this.translateTranslationUnitDecl(node);
            case 'FunctionDecl':
                return this.translateFunctionDecl(node);
            case 'VarDecl':
            case 'ParmVarDecl':
                return this.translateVarDecl(node as DeclNode);
            case 'RecordDecl':
                return this.translateRecordDecl(node);
            case 'FieldDecl':
                return this.translateFieldDecl(node);
            case 'EnumDecl':
                return this.translateEnumDecl(node);
            case 'EnumConstantDecl':
                return this.translateEnumConstantDecl(node);
            case 'TypedefDecl':
            case 'TypeAliasDecl':
                return this.translateTypedefDecl(node);
            case 'EmptyDecl':
                return this.translateEmptyDecl(node);
            case 'FileScopeAsmDecl':
                return this.translateFileScopeAsmDecl(node);
            case 'LabelDecl':
                return this.translateLabelDecl(node);
            default:
                // Unknown declaration - create a placeholder
                console.warn(`Unknown declaration kind: ${node.kind}`);
                return this.translateUnknownDecl(node);
        }
    }

    /**
     * Translate TranslationUnitDecl - the root of the AST.
     */
    private translateTranslationUnitDecl(node: ASTNode): OcamlBlock {
        const decls: OcamlValue[] = [];

        // Translate all child declarations
        if (node.inner) {
            for (const child of node.inner) {
                // Skip implicit declarations
                if (child.isImplicit) continue;

                try {
                    decls.push(this.translateDecl(child));
                } catch (e) {
                    console.warn(`Skipping declaration ${child.kind}: ${e}`);
                }
            }
        }

        // Create TranslationUnitDecl variant with list of decls
        const kind = caml_alloc(1, Tags.MLTAG_TranslationUnitDecl);
        Store_field(kind, 0, Val_list(decls, (d) => d));

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }

    /**
     * Translate EmptyDecl.
     */
    private translateEmptyDecl(node: ASTNode): OcamlBlock {
        // EmptyDecl is a constant constructor
        const kind = Val_int(Tags.MLTAG_EmptyDecl);
        return this.createDeclRecord(kind, node);
    }

    /**
     * Translate FileScopeAsmDecl.
     */
    private translateFileScopeAsmDecl(node: ASTNode): OcamlBlock {
        const kind = caml_alloc(1, Tags.MLTAG_FileScopeAsmDecl);
        // The asm string would be in a child StringLiteral
        const asmStr = this.extractAsmString(node);
        Store_field(kind, 0, caml_copy_string(asmStr));
        return this.createDeclRecord(kind, node);
    }

    private extractAsmString(node: ASTNode): string {
        // Try to find StringLiteral in children
        if (node.inner) {
            for (const child of node.inner) {
                if (child.kind === 'StringLiteral') {
                    return (child as unknown as { value?: string }).value ?? '';
                }
            }
        }
        return '';
    }

    /**
     * Translate LabelDecl.
     */
    private translateLabelDecl(node: ASTNode): OcamlBlock {
        const declNode = node as DeclNode;
        const kind = caml_alloc(1, Tags.MLTAG_LabelDecl);
        Store_field(kind, 0, this.translateName(declNode.name));
        return this.createDeclRecord(kind, node);
    }

    /**
     * Translate unknown declaration types.
     */
    private translateUnknownDecl(node: ASTNode): OcamlBlock {
        // Create an EmptyDecl as fallback
        const kind = Val_int(Tags.MLTAG_EmptyDecl);
        return this.createDeclRecord(kind, node);
    }

    /**
     * Translate FunctionDecl.
     *
     * OCaml type: function_decl record with many fields
     */
    private translateFunctionDecl(node: ASTNode): OcamlBlock {
        const declNode = node as DeclNode & {
            variadic?: boolean;
            inline?: boolean;
            storageClass?: string;
        };

        // Create function_decl record (15 fields - includes C++ fields)
        // OCaml type:
        //   0: function_uid: uid
        //   1: function_name: name
        //   2: function_body: stmt option
        //   3: function_is_variadic: bool
        //   4: function_is_main: bool
        //   5: function_is_global: bool
        //   6: function_storage_class: storage_class
        //   7: function_return_type: type_qual
        //   8: function_params: param_var_decl array
        //   9: function_range: range
        //  10: function_name_range: range
        //  11: function_com: comment list
        //  12: function_template: function_template_specialization option
        //  13: function_overloaded_operator: overloaded_operator option
        //  14: function_method: cxx_method_decl option
        const funcDecl = caml_alloc_tuple(15);

        // function_uid
        Store_field(funcDecl, 0, Val_int(generateUid()));

        // function_name
        Store_field(funcDecl, 1, this.translateName(declNode.name, declNode.mangledName));

        // function_body - look for CompoundStmt child
        const body = this.findChildByKind(node, 'CompoundStmt');
        if (body && this.translateStmtFn) {
            const bodyVal = this.translateStmtFn(body);
            Store_field(funcDecl, 2, Val_option(bodyVal, (v) => v));
        } else {
            Store_field(funcDecl, 2, Val_int(0));  // None
        }

        // function_is_variadic
        Store_field(funcDecl, 3, Val_bool(declNode.variadic ?? false));

        // function_is_main
        Store_field(funcDecl, 4, Val_bool(declNode.name === 'main'));

        // function_is_global (true if no static keyword)
        Store_field(funcDecl, 5, Val_bool(declNode.storageClass !== 'static'));

        // function_storage_class
        Store_field(funcDecl, 6, Val_int(this.translateStorageClass(declNode.storageClass)));

        // function_return_type - extract from type
        const returnType = this.extractReturnType(declNode.type?.qualType ?? 'void');
        Store_field(funcDecl, 7, this.typeTranslator.translateQualType(returnType));

        // function_params - translate ParmVarDecl children
        const params = this.findChildrenByKind(node, 'ParmVarDecl');
        Store_field(funcDecl, 8, Val_array(params, (p) => this.translateVarDeclInner(p as DeclNode)));

        // function_range
        Store_field(funcDecl, 9, this.locTranslator.translateRange(node.range));

        // function_name_range (use loc if available)
        Store_field(funcDecl, 10, this.locTranslator.translateRange(node.range));

        // function_com (comments - empty for now)
        Store_field(funcDecl, 11, 0);  // empty list

        // function_template (None for C)
        Store_field(funcDecl, 12, Val_int(0));  // None

        // function_overloaded_operator (None for C)
        Store_field(funcDecl, 13, Val_int(0));  // None

        // function_method (None for C - this is for C++ methods)
        Store_field(funcDecl, 14, Val_int(0));  // None

        // Wrap in FunctionDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_FunctionDecl);
        Store_field(kind, 0, funcDecl);

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }

    /**
     * Extract return type from function type string.
     */
    private extractReturnType(funcType: string): string {
        // Function types look like: "int (int, char *)"
        const parenIdx = funcType.indexOf('(');
        if (parenIdx > 0) {
            return funcType.substring(0, parenIdx).trim();
        }
        return funcType;
    }

    /**
     * Translate storage class.
     */
    private translateStorageClass(storageClass: string | undefined): number {
        switch (storageClass) {
            case 'extern': return Tags.MLTAG_SC_Extern;
            case 'static': return Tags.MLTAG_SC_Static;
            case 'auto': return Tags.MLTAG_SC_Auto;
            case 'register': return Tags.MLTAG_SC_Register;
            default: return Tags.MLTAG_SC_None;
        }
    }

    /**
     * Find a child node by kind.
     */
    private findChildByKind(node: ASTNode, kind: string): ASTNode | undefined {
        if (!node.inner) return undefined;
        return node.inner.find((child) => child.kind === kind);
    }

    /**
     * Find all children of a certain kind.
     */
    private findChildrenByKind(node: ASTNode, kind: string): ASTNode[] {
        if (!node.inner) return [];
        return node.inner.filter((child) => child.kind === kind);
    }

    /**
     * Translate VarDecl.
     */
    private translateVarDecl(node: DeclNode): OcamlBlock {
        const varDecl = this.translateVarDeclInner(node);

        // Wrap in VarDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_VarDecl);
        Store_field(kind, 0, varDecl);

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }

    /**
     * Translate var_decl record (shared between VarDecl and ParmVarDecl).
     */
    private translateVarDeclInner(node: DeclNode): OcamlBlock {
        const varDeclNode = node as DeclNode & {
            init?: string;
            storageClass?: string;
        };

        // var_decl has 10 fields
        const varDecl = caml_alloc_tuple(10);

        // var_uid
        Store_field(varDecl, 0, Val_int(generateUid()));

        // var_name
        Store_field(varDecl, 1, this.translateName(node.name));

        // var_type
        Store_field(varDecl, 2, this.typeTranslator.translateQualType(node.type?.qualType));

        // var_storage_class
        Store_field(varDecl, 3, Val_int(this.translateStorageClass(varDeclNode.storageClass)));

        // var_init - look for initializer expression
        const initExpr = this.findInitializer(node);
        if (initExpr && this.translateExprFn) {
            Store_field(varDecl, 4, Val_option(this.translateExprFn(initExpr), (v) => v));
        } else {
            Store_field(varDecl, 4, Val_int(0));  // None
        }

        // var_is_file_scoped
        Store_field(varDecl, 5, Val_bool(node.kind === 'VarDecl'));

        // var_is_local (false for file-scope, true for function params and locals)
        Store_field(varDecl, 6, Val_bool(node.kind === 'ParmVarDecl'));

        // var_range
        Store_field(varDecl, 7, this.locTranslator.translateRange(node.range));

        // var_com (comments)
        Store_field(varDecl, 8, 0);  // empty list

        // var_template (None for C)
        Store_field(varDecl, 9, Val_int(0));  // None

        return varDecl;
    }

    /**
     * Find initializer expression in variable declaration.
     */
    private findInitializer(node: ASTNode): ASTNode | undefined {
        if (!node.inner) return undefined;
        // The initializer is typically the last child that's not a type
        for (const child of node.inner) {
            if (!child.kind.includes('Type') && !child.kind.includes('Decl')) {
                return child;
            }
        }
        return undefined;
    }

    /**
     * Translate RecordDecl (struct/union).
     */
    private translateRecordDecl(node: ASTNode): OcamlBlock {
        const recordNode = node as DeclNode & {
            tagUsed?: string;  // "struct" or "union"
            completeDefinition?: boolean;
        };

        // record_decl has 17 fields
        const recordDecl = caml_alloc_tuple(17);

        // record_uid
        Store_field(recordDecl, 0, Val_int(generateUid()));

        // record_name
        Store_field(recordDecl, 1, this.translateName(recordNode.name));

        // record_kind (struct or union)
        const isUnion = recordNode.tagUsed === 'union';
        Store_field(recordDecl, 2, Val_int(isUnion ? Tags.MLTAG_TTK_Union : Tags.MLTAG_TTK_Struct));

        // record_has_flexible_array_member
        Store_field(recordDecl, 3, Val_bool(false));

        // record_has_volatile_member
        Store_field(recordDecl, 4, Val_bool(false));

        // record_is_anonymous
        Store_field(recordDecl, 5, Val_bool(!recordNode.name));

        // record_is_complete
        Store_field(recordDecl, 6, Val_bool(recordNode.completeDefinition ?? false));

        // record_is_valid
        Store_field(recordDecl, 7, Val_bool(true));

        // record_size (Int64 as string)
        Store_field(recordDecl, 8, caml_copy_string('0'));

        // record_data_size
        Store_field(recordDecl, 9, caml_copy_string('0'));

        // record_alignment
        Store_field(recordDecl, 10, caml_copy_string('1'));

        // record_fields - translate FieldDecl children
        const fields = this.findChildrenByKind(node, 'FieldDecl');
        Store_field(recordDecl, 11, Val_list_indexed(fields, (f: ASTNode, i: number) => this.translateFieldDeclInner(f, i)));

        // record_typedef (None)
        Store_field(recordDecl, 12, Val_int(0));

        // record_range
        Store_field(recordDecl, 13, this.locTranslator.translateRange(node.range));

        // record_com
        Store_field(recordDecl, 14, 0);  // empty list

        // record_template (C++ only)
        Store_field(recordDecl, 15, Val_int(0));  // None

        // record_base_class (C++ only)
        Store_field(recordDecl, 16, 0);  // empty list

        // Wrap in RecordDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_RecordDecl);
        Store_field(kind, 0, recordDecl);

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }

    /**
     * Translate FieldDecl.
     */
    private translateFieldDecl(node: ASTNode): OcamlBlock {
        const fieldDecl = this.translateFieldDeclInner(node, 0);

        // Wrap in FieldDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_FieldDecl);
        Store_field(kind, 0, fieldDecl);

        return this.createDeclRecord(kind, node);
    }

    /**
     * Translate field_decl record.
     */
    private translateFieldDeclInner(node: ASTNode, index: number): OcamlBlock {
        const fieldNode = node as DeclNode & {
            isBitfield?: boolean;
        };

        // field_decl has 12 fields
        const fieldDecl = caml_alloc_tuple(12);

        // field_uid
        Store_field(fieldDecl, 0, Val_int(generateUid()));

        // field_name
        Store_field(fieldDecl, 1, this.translateName(fieldNode.name));

        // field_index
        Store_field(fieldDecl, 2, Val_int(index));

        // field_type
        Store_field(fieldDecl, 3, this.typeTranslator.translateQualType(fieldNode.type?.qualType));

        // field_bitwidth (Option)
        Store_field(fieldDecl, 4, Val_int(0));  // None for now

        // field_is_unnamed_bitfield
        Store_field(fieldDecl, 5, Val_bool(false));

        // field_is_in_valid_record
        Store_field(fieldDecl, 6, Val_bool(true));

        // field_offset (Int64 as string)
        Store_field(fieldDecl, 7, caml_copy_string('0'));

        // field_variable_length_array (None)
        Store_field(fieldDecl, 8, Val_int(0));

        // field_range
        Store_field(fieldDecl, 9, this.locTranslator.translateRange(node.range));

        // field_com
        Store_field(fieldDecl, 10, 0);  // empty list

        // field_attrs
        Store_field(fieldDecl, 11, 0);  // empty list

        return fieldDecl;
    }

    /**
     * Translate EnumDecl.
     */
    private translateEnumDecl(node: ASTNode): OcamlBlock {
        const enumNode = node as DeclNode & {
            fixedUnderlyingType?: { qualType: string };
        };

        // enum_decl has 12 fields
        const enumDecl = caml_alloc_tuple(12);

        // enum_uid
        Store_field(enumDecl, 0, Val_int(generateUid()));

        // enum_name
        Store_field(enumDecl, 1, this.translateName(enumNode.name));

        // enum_num_positive_bits
        Store_field(enumDecl, 2, Val_int(32));  // Assume 32-bit

        // enum_num_negative_bits
        Store_field(enumDecl, 3, Val_int(0));

        // enum_is_complete
        Store_field(enumDecl, 4, Val_bool(true));

        // enum_integer_type (Option)
        if (enumNode.fixedUnderlyingType) {
            Store_field(enumDecl, 5, Val_option(
                this.typeTranslator.translateQualType(enumNode.fixedUnderlyingType.qualType),
                (v) => v
            ));
        } else {
            Store_field(enumDecl, 5, Val_int(0));  // None
        }

        // enum_promotion_type (Option)
        Store_field(enumDecl, 6, Val_int(0));  // None

        // enum_cst - translate EnumConstantDecl children
        const constants = this.findChildrenByKind(node, 'EnumConstantDecl');
        Store_field(enumDecl, 7, Val_list(constants, (c) => this.translateEnumConstantDeclInner(c)));

        // enum_typedef (None)
        Store_field(enumDecl, 8, Val_int(0));

        // enum_range
        Store_field(enumDecl, 9, this.locTranslator.translateRange(node.range));

        // enum_com
        Store_field(enumDecl, 10, 0);  // empty list

        // Wrap in EnumDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_EnumDecl);
        Store_field(kind, 0, enumDecl);

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }

    /**
     * Translate EnumConstantDecl.
     */
    private translateEnumConstantDecl(node: ASTNode): OcamlBlock {
        const enumCstDecl = this.translateEnumConstantDeclInner(node);

        // Wrap in EnumConstantDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_EnumConstantDecl);
        Store_field(kind, 0, enumCstDecl);

        return this.createDeclRecord(kind, node);
    }

    /**
     * Translate enum_cst_decl record.
     */
    private translateEnumConstantDeclInner(node: ASTNode): OcamlBlock {
        const enumCstNode = node as DeclNode & {
            value?: { value: string };
        };

        // enum_cst_decl has 6 fields
        const enumCstDecl = caml_alloc_tuple(6);

        // enum_cst_uid
        Store_field(enumCstDecl, 0, Val_int(generateUid()));

        // enum_cst_name
        Store_field(enumCstDecl, 1, this.translateName(enumCstNode.name));

        // enum_cst_val (Z.t as string)
        const value = enumCstNode.value?.value ?? '0';
        Store_field(enumCstDecl, 2, caml_copy_string(value));

        // enum_cst_range
        Store_field(enumCstDecl, 3, this.locTranslator.translateRange(node.range));

        // enum_cst_com
        Store_field(enumCstDecl, 4, 0);  // empty list

        // enum_cst_attrs
        Store_field(enumCstDecl, 5, 0);  // empty list

        return enumCstDecl;
    }

    /**
     * Translate TypedefDecl.
     */
    private translateTypedefDecl(node: ASTNode): OcamlBlock {
        const typedefNode = node as DeclNode;

        // typedef_decl has 5 fields
        const typedefDecl = caml_alloc_tuple(5);

        // typedef_uid
        Store_field(typedefDecl, 0, Val_int(generateUid()));

        // typedef_name
        Store_field(typedefDecl, 1, this.translateName(typedefNode.name));

        // typedef_underlying_type
        Store_field(typedefDecl, 2, this.typeTranslator.translateQualType(typedefNode.type?.qualType));

        // typedef_range
        Store_field(typedefDecl, 3, this.locTranslator.translateRange(node.range));

        // typedef_com
        Store_field(typedefDecl, 4, 0);  // empty list

        // Wrap in TypedefNameDecl variant
        const kind = caml_alloc(1, Tags.MLTAG_TypedefNameDecl);
        Store_field(kind, 0, typedefDecl);

        const result = this.createDeclRecord(kind, node);
        this.declCache.set(node.id, result);
        return result;
    }
}
