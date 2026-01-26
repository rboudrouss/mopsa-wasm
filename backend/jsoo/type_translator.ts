/**
 * Type Translator
 * 
 * Converts Clang JSON type representations to OCaml typ and type_qual values.
 * 
 * This translator handles the complex type system including:
 * - Builtin types (void, int, float, etc.)
 * - Pointer types
 * - Array types
 * - Function types
 * - Record (struct/union) types
 * - Enum types
 * - Typedef types
 * - And many more
 * 
 * Note: Type translation is complex because:
 * 1. Types can be recursive (e.g., linked list node pointing to itself)
 * 2. Types need to be shared/cached to maintain identity
 * 3. The JSON format from Clang differs from the OCaml representation
 */

import type { QualType, ASTNode } from './clang_ast_json';
import {
    OcamlValue,
    OcamlBlock,
    Val_int,
    Val_bool,
    caml_alloc,
    caml_alloc_tuple,
    caml_copy_string,
    Store_field,
    TranslationCache,
} from './ocaml_values';
import * as Tags from './clang_ast_tags';

// ============================================================================
// Types
// ============================================================================

/** Parsed type information from Clang JSON */
export interface TypeInfo {
    qualType: string;           // e.g., "int", "const char *"
    desugaredQualType?: string; // e.g., for typedefs, the underlying type
    typeAliasDeclId?: string;   // Reference to typedef decl
    isConst?: boolean;
    isRestrict?: boolean;
    isVolatile?: boolean;
}

// Forward declaration context for handling recursive types
export interface TranslationContext {
    /** Get declaration by ID - set by main translator */
    getDeclById?: (id: string) => ASTNode | undefined;
    /** Translate a declaration - set by main translator */
    translateDecl?: (node: ASTNode) => OcamlValue;
    /** Translate an expression - set by main translator */
    translateExpr?: (node: ASTNode) => OcamlValue;
}

// ============================================================================
// Type Translator Class
// ============================================================================

export class TypeTranslator {
    /** Cache for types to handle sharing and cycles */
    private typeCache = new TranslationCache<string>();
    
    /** Cache for qual_type tuples */
    private qualTypeCache = new Map<string, OcamlBlock>();
    
    /** Translation context */
    private context: TranslationContext = {};
    
    constructor(context?: TranslationContext) {
        if (context) {
            this.context = context;
        }
    }
    
    /**
     * Set the translation context for cross-references.
     */
    setContext(context: TranslationContext): void {
        this.context = { ...this.context, ...context };
    }
    
    /**
     * Create an OCaml qual (type qualifiers) record.
     * 
     * OCaml type: { qual_is_const: bool; qual_is_restrict: bool; qual_is_volatile: bool }
     */
    translateQual(isConst: boolean, isRestrict: boolean, isVolatile: boolean): OcamlBlock {
        const block = caml_alloc_tuple(3);
        Store_field(block, 0, Val_bool(isConst));
        Store_field(block, 1, Val_bool(isRestrict));
        Store_field(block, 2, Val_bool(isVolatile));
        return block;
    }
    
    /**
     * Parse type qualifiers from a type string.
     */
    parseQualifiers(typeStr: string): { isConst: boolean; isRestrict: boolean; isVolatile: boolean; baseType: string } {
        let isConst = false;
        let isRestrict = false;
        let isVolatile = false;
        let baseType = typeStr;
        
        // Check for qualifiers at the beginning or end
        if (baseType.startsWith('const ')) {
            isConst = true;
            baseType = baseType.substring(6);
        }
        if (baseType.startsWith('volatile ')) {
            isVolatile = true;
            baseType = baseType.substring(9);
        }
        if (baseType.startsWith('restrict ')) {
            isRestrict = true;
            baseType = baseType.substring(9);
        }
        // Also check for trailing qualifiers (for pointer types)
        if (baseType.endsWith(' const')) {
            isConst = true;
            baseType = baseType.slice(0, -6);
        }
        if (baseType.endsWith(' volatile')) {
            isVolatile = true;
            baseType = baseType.slice(0, -9);
        }
        if (baseType.endsWith(' restrict')) {
            isRestrict = true;
            baseType = baseType.slice(0, -9);
        }
        
        return { isConst, isRestrict, isVolatile, baseType: baseType.trim() };
    }
    
    /**
     * Translate a builtin type string to the corresponding tag.
     * Returns the tag number or undefined if not a builtin.
     */
    getBuiltinTypeTag(typeStr: string): number | undefined {
        const builtinMap: Record<string, number> = {
            'void': Tags.MLTAG_Type_Void,
            '_Bool': Tags.MLTAG_Type_Bool,
            'bool': Tags.MLTAG_Type_Bool,
            'char': Tags.MLTAG_Type_Char_S, // Assume signed by default
            'unsigned char': Tags.MLTAG_Type_UChar,
            'signed char': Tags.MLTAG_Type_SChar,
            'wchar_t': Tags.MLTAG_Type_WChar_S,
            'char16_t': Tags.MLTAG_Type_Char16,
            'char32_t': Tags.MLTAG_Type_Char32,
            'short': Tags.MLTAG_Type_Short,
            'short int': Tags.MLTAG_Type_Short,
            'signed short': Tags.MLTAG_Type_Short,
            'signed short int': Tags.MLTAG_Type_Short,
            'unsigned short': Tags.MLTAG_Type_UShort,
            'unsigned short int': Tags.MLTAG_Type_UShort,
            'int': Tags.MLTAG_Type_Int,
            'signed': Tags.MLTAG_Type_Int,
            'signed int': Tags.MLTAG_Type_Int,
            'unsigned': Tags.MLTAG_Type_UInt,
            'unsigned int': Tags.MLTAG_Type_UInt,
            'long': Tags.MLTAG_Type_Long,
            'long int': Tags.MLTAG_Type_Long,
            'signed long': Tags.MLTAG_Type_Long,
            'signed long int': Tags.MLTAG_Type_Long,
            'unsigned long': Tags.MLTAG_Type_ULong,
            'unsigned long int': Tags.MLTAG_Type_ULong,
            'long long': Tags.MLTAG_Type_LongLong,
            'long long int': Tags.MLTAG_Type_LongLong,
            'signed long long': Tags.MLTAG_Type_LongLong,
            'signed long long int': Tags.MLTAG_Type_LongLong,
            'unsigned long long': Tags.MLTAG_Type_ULongLong,
            'unsigned long long int': Tags.MLTAG_Type_ULongLong,
            '__int128': Tags.MLTAG_Type_Int128,
            '__int128_t': Tags.MLTAG_Type_Int128,
            'unsigned __int128': Tags.MLTAG_Type_UInt128,
            '__uint128_t': Tags.MLTAG_Type_UInt128,
            '__fp16': Tags.MLTAG_Type_Half,
            '_Float16': Tags.MLTAG_Type_Float,  // Map Float16 to Float
            '__bf16': Tags.MLTAG_Type_Float,    // Map BFloat16 to Float
            'float': Tags.MLTAG_Type_Float,
            'double': Tags.MLTAG_Type_Double,
            'long double': Tags.MLTAG_Type_LongDouble,
            '__float128': Tags.MLTAG_Type_Float128,
            'nullptr_t': Tags.MLTAG_Type_NullPtr,
        };
        return builtinMap[typeStr];
    }

    /**
     * Create an OCaml builtin_type value.
     *
     * OCaml type: builtin_type (constant constructors mostly)
     */
    translateBuiltinType(typeStr: string): OcamlValue {
        const tag = this.getBuiltinTypeTag(typeStr);
        if (tag !== undefined) {
            // Constant constructor - just return the tag
            return Val_int(tag);
        }
        // Unknown builtin - Type_unknown_builtin of string
        const block = caml_alloc(1, Tags.MLTAG_Type_unknown_builtin);
        Store_field(block, 0, caml_copy_string(typeStr));
        return block;
    }

    /**
     * Translate type_qual from QualType.
     *
     * OCaml type: type_qual = typ * qual
     * The order is: (type, qualifiers) - NOT (qualifiers, type)!
     */
    translateQualType(qualType: QualType | string | undefined): OcamlBlock {
        const typeStr = typeof qualType === 'string' ? qualType : qualType?.qualType ?? 'void';

        // Check cache
        const cached = this.qualTypeCache.get(typeStr);
        if (cached) {
            return cached;
        }

        // Parse qualifiers
        const { isConst, isRestrict, isVolatile, baseType } = this.parseQualifiers(typeStr);

        // Create type_qual tuple (typ * qual) - type FIRST, then qualifiers
        const block = caml_alloc_tuple(2);
        Store_field(block, 0, this.translateType(baseType));  // typ first
        Store_field(block, 1, this.translateQual(isConst, isRestrict, isVolatile));  // qual second

        this.qualTypeCache.set(typeStr, block);
        return block;
    }

    /**
     * Main type translation method.
     * Translates a type string to OCaml typ.
     */
    translateType(typeStr: string): OcamlValue {
        // Try to use cached value
        const cached = this.typeCache.get(typeStr);
        if (cached !== undefined) {
            return cached;
        }

        // Strip qualifiers for base type determination
        const { baseType } = this.parseQualifiers(typeStr);

        // Check for pointer type
        if (baseType.endsWith('*')) {
            return this.translatePointerType(baseType);
        }

        // Check for array type
        const arrayMatch = baseType.match(/^(.+)\[(\d*)\]$/);
        if (arrayMatch) {
            return this.translateArrayType(arrayMatch[1].trim(), arrayMatch[2]);
        }

        // Check for function type
        if (baseType.includes('(') && baseType.includes(')')) {
            return this.translateFunctionType(baseType);
        }

        // Check for struct/union
        if (baseType.startsWith('struct ')) {
            return this.translateStructType(baseType.substring(7));
        }
        if (baseType.startsWith('union ')) {
            return this.translateUnionType(baseType.substring(6));
        }
        if (baseType.startsWith('enum ')) {
            return this.translateEnumType(baseType.substring(5));
        }

        // Check for builtin type
        const builtinTag = this.getBuiltinTypeTag(baseType);
        if (builtinTag !== undefined) {
            const block = caml_alloc(1, Tags.MLTAG_BuiltinType);
            Store_field(block, 0, Val_int(builtinTag));
            this.typeCache.set(typeStr, block);
            return block;
        }

        // Unknown type - create UnknownType variant
        const block = caml_alloc(2, Tags.MLTAG_UnknownType);
        Store_field(block, 0, Val_int(0));  // type class
        Store_field(block, 1, caml_copy_string(baseType));
        this.typeCache.set(typeStr, block);
        return block;
    }

    /**
     * Translate pointer type.
     *
     * OCaml: PointerType of type_qual
     */
    private translatePointerType(typeStr: string): OcamlValue {
        const pointeeType = typeStr.slice(0, -1).trim();
        const block = caml_alloc(1, Tags.MLTAG_PointerType);
        Store_field(block, 0, this.translateQualType(pointeeType));
        this.typeCache.set(typeStr, block);
        return block;
    }

    /**
     * Translate array type.
     *
     * OCaml: ArrayType of array_type
     */
    private translateArrayType(elementType: string, sizeStr: string): OcamlValue {
        const arrayTypeBlock = caml_alloc_tuple(3);

        // array_element_type
        Store_field(arrayTypeBlock, 0, this.translateQualType(elementType));

        // array_size
        if (sizeStr === '') {
            // Incomplete array type
            Store_field(arrayTypeBlock, 1, Val_int(Tags.MLTAG_IncompleteArrayType));
        } else {
            // Constant array type
            const sizeBlock = caml_alloc(1, Tags.MLTAG_ConstantArrayType);
            Store_field(sizeBlock, 0, caml_copy_string(sizeStr));  // Z.t as string
            Store_field(arrayTypeBlock, 1, sizeBlock);
        }

        // array_size_modifier (default to normal)
        Store_field(arrayTypeBlock, 2, Val_int(Tags.MLTAG_SIZE_NORMAL));

        const block = caml_alloc(1, Tags.MLTAG_ArrayType);
        Store_field(block, 0, arrayTypeBlock);
        return block;
    }

    /**
     * Translate function type (simplified).
     */
    private translateFunctionType(typeStr: string): OcamlValue {
        // This is a simplified implementation
        // Full implementation would parse return type and parameters
        const block = caml_alloc(1, Tags.MLTAG_FunctionNoProtoType);
        const funBlock = caml_alloc_tuple(1);
        Store_field(funBlock, 0, this.translateQualType('int'));  // Default return type
        Store_field(block, 0, funBlock);
        return block;
    }

    /**
     * Translate a record (struct or union) type reference.
     *
     * OCaml: RecordType of record_decl
     *
     * TODO: This needs to be connected to the declaration translator to get
     * the actual record_decl reference. For now, we store the name for later resolution.
     */
    private translateRecordType(name: string, isUnion: boolean): OcamlValue {
        const block = caml_alloc(1, Tags.MLTAG_RecordType);
        // TODO: Replace with actual record_decl lookup via context.getDeclById
        // For now, create a minimal placeholder record_decl
        const recordDecl = this.createPlaceholderRecordDecl(name, isUnion);
        Store_field(block, 0, recordDecl);
        return block;
    }

    /**
     * Translate struct type reference.
     */
    private translateStructType(name: string): OcamlValue {
        return this.translateRecordType(name, false);
    }

    /**
     * Translate union type reference.
     */
    private translateUnionType(name: string): OcamlValue {
        return this.translateRecordType(name, true);
    }

    /**
     * Create a placeholder record_decl.
     * This will be replaced with actual record lookup when declarations are available.
     */
    private createPlaceholderRecordDecl(name: string, isUnion: boolean): OcamlBlock {
        // record_decl has 17 fields in OCaml
        const block = caml_alloc_tuple(17);
        Store_field(block, 0, Val_int(0));  // record_uid
        Store_field(block, 1, this.createPlaceholderName(name));  // record_name
        Store_field(block, 2, Val_int(isUnion ? Tags.MLTAG_TTK_Union : Tags.MLTAG_TTK_Struct));  // record_kind
        Store_field(block, 3, Val_int(0));  // record_has_flexible_array_member
        Store_field(block, 4, Val_int(0));  // record_has_volatile_member
        Store_field(block, 5, Val_int(0));  // record_is_anonymous
        Store_field(block, 6, Val_int(0));  // record_is_complete
        Store_field(block, 7, Val_int(0));  // record_is_valid
        Store_field(block, 8, caml_copy_string('0'));  // record_size (Int64 as string)
        Store_field(block, 9, caml_copy_string('0'));  // record_data_size
        Store_field(block, 10, caml_copy_string('0'));  // record_alignment
        Store_field(block, 11, 0);  // record_fields: empty list
        Store_field(block, 12, Val_int(0));  // record_typedef: None
        Store_field(block, 13, this.createInvalidRange());  // record_range
        Store_field(block, 14, 0);  // record_com: empty list
        Store_field(block, 15, Val_int(0));  // record_template: None
        Store_field(block, 16, 0);  // record_base_class: empty list
        return block;
    }

    /**
     * Create a placeholder name record.
     *
     * OCaml type:
     * type name = { name_print; name_qualified; name_declaration }
     * type declaration_name = Name_Identifier of string | ...
     */
    private createPlaceholderName(name: string): OcamlBlock {
        const block = caml_alloc_tuple(3);
        Store_field(block, 0, caml_copy_string(name));  // name_print
        Store_field(block, 1, caml_copy_string(name));  // name_qualified

        // name_declaration: Name_Identifier of string
        // This is a variant with an argument, so it must be [tag, string_value]
        const declName = caml_alloc(1, Tags.MLTAG_Identifier);
        Store_field(declName, 0, caml_copy_string(name));
        Store_field(block, 2, declName);

        return block;
    }

    /**
     * Create an invalid range placeholder.
     */
    private createInvalidRange(): OcamlBlock {
        const invalidLoc = caml_alloc_tuple(3);
        Store_field(invalidLoc, 0, Val_int(-1));  // loc_line
        Store_field(invalidLoc, 1, Val_int(-1));  // loc_column
        Store_field(invalidLoc, 2, caml_copy_string('<invalid>'));  // loc_file

        const invalidEloc = caml_alloc_tuple(2);
        Store_field(invalidEloc, 0, invalidLoc);  // eloc_loc
        Store_field(invalidEloc, 1, 0);  // eloc_stack: empty list

        const range = caml_alloc_tuple(2);
        Store_field(range, 0, invalidEloc);  // range_begin
        Store_field(range, 1, invalidEloc);  // range_end
        return range;
    }

    /**
     * Translate enum type reference.
     *
     * OCaml: EnumType of enum_decl
     */
    private translateEnumType(name: string): OcamlValue {
        const block = caml_alloc(1, Tags.MLTAG_EnumType);
        // TODO: Replace with actual enum_decl lookup via context.getDeclById
        const enumDecl = this.createPlaceholderEnumDecl(name);
        Store_field(block, 0, enumDecl);
        return block;
    }

    /**
     * Create a placeholder enum_decl.
     */
    private createPlaceholderEnumDecl(name: string): OcamlBlock {
        // enum_decl has 12 fields in OCaml
        const block = caml_alloc_tuple(12);
        Store_field(block, 0, Val_int(0));  // enum_uid
        Store_field(block, 1, this.createPlaceholderName(name));  // enum_name
        Store_field(block, 2, Val_int(0));  // enum_num_positive_bits
        Store_field(block, 3, Val_int(0));  // enum_num_negative_bits
        Store_field(block, 4, Val_int(0));  // enum_is_complete
        Store_field(block, 5, Val_int(0));  // enum_integer_type: None
        Store_field(block, 6, Val_int(0));  // enum_promotion_type: None
        Store_field(block, 7, 0);  // enum_cst: empty list
        Store_field(block, 8, Val_int(0));  // enum_typedef: None
        Store_field(block, 9, this.createInvalidRange());  // enum_range
        Store_field(block, 10, 0);  // enum_com: empty list
        return block;
    }
}

