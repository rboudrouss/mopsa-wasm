/**
 * OCaml Variant Tag Constants for Clang AST Types
 * 
 * These constants match the enum values in Clang_to_ml.cc and correspond
 * to the variant constructors in Clang_AST.ml.
 * 
 * IMPORTANT: The order must match exactly the OCaml type definitions.
 * In OCaml, variant constructors are numbered in order of declaration.
 * Constant constructors (no args) and non-constant constructors (with args)
 * are numbered separately.
 */

// ============================================================================
// Comment Kind (comment_kind) - constant constructors
// ============================================================================
export const MLTAG_RCK_Invalid = 0;
export const MLTAG_RCK_OrdinaryBCPL = 1;
export const MLTAG_RCK_OrdinaryC = 2;
export const MLTAG_RCK_BCPLSlash = 3;
export const MLTAG_RCK_BCPLExcl = 4;
export const MLTAG_RCK_JavaDoc = 5;
export const MLTAG_RCK_Qt = 6;
export const MLTAG_RCK_Merged = 7;

// ============================================================================
// Attribute Syntax (attr_syntax) - constant constructors
// ============================================================================
export const MLTAG_AS_GNU = 0;
export const MLTAG_AS_CXX11 = 1;
export const MLTAG_AS_C23 = 2;
export const MLTAG_AS_Declspec = 3;
export const MLTAG_AS_Microsoft = 4;
export const MLTAG_AS_Keyword = 5;
export const MLTAG_AS_Pragma = 6;
export const MLTAG_AS_ContextSensitiveKeyword = 7;
export const MLTAG_AS_HLSLAnnotation = 8;
export const MLTAG_AS_Implicit = 9;

// ============================================================================
// Declaration Kind (decl_kind) - non-constant constructors (with args)
// ============================================================================
export const MLTAG_TranslationUnitDecl = 0;
export const MLTAG_FieldDecl = 1;
export const MLTAG_EnumConstantDecl = 2;
export const MLTAG_FileScopeAsmDecl = 3;
export const MLTAG_LinkageSpecDecl = 4;
export const MLTAG_LabelDecl = 5;
export const MLTAG_EnumDecl = 6;
export const MLTAG_RecordDecl = 7;
export const MLTAG_TypedefNameDecl = 8;
export const MLTAG_FunctionDecl = 9;
export const MLTAG_VarDecl = 10;
// C++
export const MLTAG_BlockDecl = 11;
export const MLTAG_FriendDecl = 12;
export const MLTAG_StaticAssertDecl = 13;
export const MLTAG_NamespaceAliasDecl = 14;
export const MLTAG_NamespaceDecl = 15;
export const MLTAG_BuiltinTemplateDecl = 16;
export const MLTAG_ClassTemplateDecl = 17;
export const MLTAG_FunctionTemplateDecl = 18;
export const MLTAG_TypeAliasTemplateDecl = 19;
export const MLTAG_VarTemplateDecl = 20;
export const MLTAG_TemplateTemplateParmDecl = 21;
export const MLTAG_TemplateTypeParmDecl = 22;
export const MLTAG_TypeAliasDecl = 23;
export const MLTAG_UnresolvedUsingTypenameDecl = 24;
export const MLTAG_UsingDecl = 25;
export const MLTAG_UsingDirectiveDecl = 26;
export const MLTAG_UsingPackDecl = 27;
export const MLTAG_UsingShadowDecl = 28;
export const MLTAG_BindingDecl = 29;
export const MLTAG_IndirectFieldDecl = 30;
export const MLTAG_UnresolvedUsingValueDecl = 31;
export const MLTAG_NonTypeTemplateParmDecl = 32;
export const MLTAG_UnknownDecl = 33;

// Declaration Kind - constant constructors (no args)
export const MLTAG_EmptyDecl = 0;
export const MLTAG_AccessSpecDecl = 1;

// ============================================================================
// Language (lang) - constant constructors
// ============================================================================
export const MLTAG_LANG_C = 0;
export const MLTAG_LANG_CXX = 1;

// ============================================================================
// Access Specifier (access_specifier) - constant constructors
// ============================================================================
export const MLTAG_AS_public = 0;
export const MLTAG_AS_protected = 1;
export const MLTAG_AS_private = 2;
export const MLTAG_AS_none = 3;

// ============================================================================
// Builtin Template Kind - constant constructors
// ============================================================================
export const MLTAG_BTK__make_integer_seq = 0;
export const MLTAG_BTK__type_pack_element = 1;

// ============================================================================
// Cleanup Object - non-constant constructors
// ============================================================================
export const MLTAG_Cleanup_block_decl = 0;
export const MLTAG_Cleanup_compound_literal_expr = 1;

// ============================================================================
// Storage Class (storage_class) - constant constructors
// ============================================================================
export const MLTAG_SC_None = 0;
export const MLTAG_SC_Extern = 1;
export const MLTAG_SC_Static = 2;
export const MLTAG_SC_PrivateExtern = 3;
export const MLTAG_SC_Auto = 4;
export const MLTAG_SC_Register = 5;

// ============================================================================
// Storage Duration (storage_duration) - constant constructors
// ============================================================================
export const MLTAG_SD_FullExpression = 0;
export const MLTAG_SD_Automatic = 1;
export const MLTAG_SD_Thread = 2;
export const MLTAG_SD_Static = 3;
export const MLTAG_SD_Dynamic = 4;

// ============================================================================
// Method Kind - constant/non-constant constructors
// ============================================================================
export const MLTAG_Method_Regular = 0;
export const MLTAG_Method_Destructor = 1;
// Non-constant for constructor/conversion
export const MLTAG_Method_Constructor = 0;
export const MLTAG_Method_Conversion = 1;

// ============================================================================
// Constructor Initializer Kind - non-constant constructors
// ============================================================================
export const MLTAG_Constructor_init_Base = 0;
export const MLTAG_Constructor_init_Field = 1;
export const MLTAG_Constructor_init_Indirect_field = 2;
export const MLTAG_Constructor_init_Delegating = 3;

// ============================================================================
// Declaration Name Kind - non-constant constructors
// ============================================================================
export const MLTAG_Identifier = 0;
export const MLTAG_CXXConstructorName = 1;
export const MLTAG_CXXDestructorName = 2;
export const MLTAG_CXXConversionFunctionName = 3;
export const MLTAG_CXXDeductionGuideName = 4;
export const MLTAG_CXXOperatorName = 5;
export const MLTAG_CXXLiteralOperatorName = 6;
export const MLTAG_CXXUsingDirective = 7;

// ============================================================================
// Name Specifier Kind - non-constant constructors
// ============================================================================
export const MLTAG_Name_specifier_Identifier = 0;
export const MLTAG_Name_specifier_Namespace = 1;
export const MLTAG_Name_specifier_NamespaceAlias = 2;
export const MLTAG_Name_specifier_TypeSpec = 3;
export const MLTAG_Name_specifier_TypeSpecWithTemplate = 4;
// Constant constructor
export const MLTAG_Name_specifier_Global = 0;

// ============================================================================
// Template Argument Kind
// ============================================================================
// Constant constructor
export const MLTAG_Template_argument_Null = 0;
// Non-constant constructors
export const MLTAG_Template_argument_Type = 0;
export const MLTAG_Template_argument_Declaration = 1;
export const MLTAG_Template_argument_NullPtr = 2;
export const MLTAG_Template_argument_Integral = 3;
export const MLTAG_Template_argument_Template = 4;
export const MLTAG_Template_argument_Expression = 5;
export const MLTAG_Template_argument_Pack = 6;

// ============================================================================
// Template Name Kind - non-constant constructors
// ============================================================================
export const MLTAG_Template_name_Template = 0;
export const MLTAG_Template_name_OverloadedTemplate = 1;
export const MLTAG_Template_name_QualifiedTemplate = 2;
export const MLTAG_Template_name_DependentTemplate = 3;
export const MLTAG_Template_name_SubstTemplateTemplateParm = 4;
export const MLTAG_Template_name_SubstTemplateTemplateParmPack = 5;

// ============================================================================
// Expression Kind (expr_kind) - non-constant constructors
// ============================================================================
export const MLTAG_ConditionalOperator = 0;
export const MLTAG_BinaryConditionalOperator = 1;
export const MLTAG_AddrLabelExpr = 2;
export const MLTAG_ArrayInitLoopExpr = 3;
export const MLTAG_ArraySubscriptExpr = 4;
export const MLTAG_AtomicExpr = 5;
export const MLTAG_CompoundAssignOperator = 6;
export const MLTAG_BinaryOperator = 7;
export const MLTAG_UnaryOperator = 8;
export const MLTAG_CallExpr = 9;
export const MLTAG_CastExpr = 10;
export const MLTAG_CharacterLiteral = 11;
export const MLTAG_ChooseExpr = 12;
export const MLTAG_CompoundLiteralExpr = 13;
export const MLTAG_DeclRefExpr = 14;
export const MLTAG_DesignatedInitExpr = 15;
export const MLTAG_FloatingLiteral = 16;
export const MLTAG_GenericSelectionExpr = 17;
export const MLTAG_ImaginaryLiteral = 18;
export const MLTAG_InitListExpr = 19;
export const MLTAG_IntegerLiteral = 20;
export const MLTAG_MemberExpr = 21;
export const MLTAG_OffsetOfExpr = 22;
export const MLTAG_OpaqueValueExpr = 23;
export const MLTAG_ParenExpr = 24;
export const MLTAG_ParenListExpr = 25;
export const MLTAG_PredefinedExpr = 26;
export const MLTAG_PseudoObjectExpr = 27;
export const MLTAG_StmtExpr = 28;
export const MLTAG_StringLiteral = 29;
export const MLTAG_UnaryExprOrTypeTraitExpr = 30;
export const MLTAG_VAArgExpr = 31;
export const MLTAG_FullExpr = 32;
export const MLTAG_ConstantExpr = 33;
// C++ expressions
export const MLTAG_ArrayTypeTraitExpr = 34;
export const MLTAG_CXXBindTemporaryExpr = 35;
export const MLTAG_CXXBoolLiteralExpr = 36;
export const MLTAG_CXXConstructExpr = 37;
export const MLTAG_CXXDefaultArgExpr = 38;
export const MLTAG_CXXDefaultInitExpr = 39;
export const MLTAG_CXXDeleteExpr = 40;
export const MLTAG_CXXDependentScopeMemberExpr = 41;
export const MLTAG_CXXFoldExpr = 42;
export const MLTAG_CXXInheritedCtorInitExpr = 43;
export const MLTAG_CXXNewExpr = 44;
export const MLTAG_CXXNoexceptExpr = 45;
export const MLTAG_CXXPseudoDestructorExpr = 46;
export const MLTAG_CXXStdInitializerListExpr = 47;
export const MLTAG_CXXThisExpr = 48;
export const MLTAG_CXXThrowExpr = 49;
export const MLTAG_CXXTypeidExpr = 50;
export const MLTAG_CXXUnresolvedConstructExpr = 51;
export const MLTAG_DependentScopeDeclRefExpr = 52;
export const MLTAG_ExpressionTraitExpr = 53;
export const MLTAG_ExprWithCleanups = 54;
export const MLTAG_FunctionParmPackExpr = 55;
export const MLTAG_MaterializeTemporaryExpr = 56;
export const MLTAG_PackExpansionExpr = 57;
export const MLTAG_SizeOfPackExpr = 58;
export const MLTAG_SubstNonTypeTemplateParmExpr = 59;
export const MLTAG_SubstNonTypeTemplateParmPackExpr = 60;
export const MLTAG_TypeTraitExpr = 61;
export const MLTAG_UnresolvedLookupExpr = 62;
export const MLTAG_UnresolvedMemberExpr = 63;
export const MLTAG_LambdaExpr = 64;
// Vectors
export const MLTAG_ConvertVectorExpr = 65;
export const MLTAG_ExtVectorElementExpr = 66;
export const MLTAG_ShuffleVectorExpr = 67;
// Unknown
export const MLTAG_UnknownExpr = 68;

// Expression Kind - constant constructors (no args)
export const MLTAG_ArrayInitIndexExpr = 0;
export const MLTAG_GNUNullExpr = 1;
export const MLTAG_ImplicitValueInitExpr = 2;
export const MLTAG_NoInitExpr = 3;
export const MLTAG_CXXNullPtrLiteralExpr = 4;
export const MLTAG_CXXScalarValueInitExpr = 5;

// ============================================================================
// Cast Kind (cast_kind) - constant constructors
// ============================================================================
export const MLTAG_CStyleCast = 0;
export const MLTAG_CXXFunctionalCast = 1;
export const MLTAG_CXXConstCast = 2;
export const MLTAG_CXXDynamicCast = 3;
export const MLTAG_CXXReinterpretCast = 4;
export const MLTAG_CXXStaticCast = 5;
export const MLTAG_ImplicitCast = 6;
export const MLTAG_BuiltinBitCast = 7;

// ============================================================================
// Character Kind (character_kind) - constant constructors
// ============================================================================
export const MLTAG_Char_Ascii = 0;
export const MLTAG_Char_Wide = 1;
export const MLTAG_Char_UTF8 = 2;
export const MLTAG_Char_UTF16 = 3;
export const MLTAG_Char_UTF32 = 4;
export const MLTAG_Char_Unevaluated = 5;

// ============================================================================
// Ident Type (ident_type) - constant constructors
// ============================================================================
export const MLTAG_Ident_Func = 0;
export const MLTAG_Ident_Function = 1;
export const MLTAG_Ident_LFunction = 2;
export const MLTAG_Ident_FuncDName = 3;
export const MLTAG_Ident_FuncSig = 4;
export const MLTAG_Ident_PrettyFunction = 5;
export const MLTAG_Ident_PrettyFunctionNoVirtual = 6;

// ============================================================================
// Unary Expr or Type Trait (unary_expr_or_type) - constant constructors
// ============================================================================
export const MLTAG_UETT_SizeOf = 0;
export const MLTAG_UETT_AlignOf = 1;
export const MLTAG_UETT_PreferredAlignOf = 2;

// ============================================================================
// Array Type Trait (array_type_trait) - constant constructors
// ============================================================================
export const MLTAG_ATT_ArrayRank = 0;
export const MLTAG_ATT_ArrayExtent = 1;

// ============================================================================
// Initialization Style (initialization_style) - constant constructors
// ============================================================================
export const MLTAG_New_NoInit = 0;
export const MLTAG_New_CallInit = 1;
export const MLTAG_New_ListInit = 2;

// ============================================================================
// Expression Trait (expression_trait) - constant constructors
// ============================================================================
export const MLTAG_ET_IsLValueExpr = 0;
export const MLTAG_ET_IsRValueExpr = 1;

// ============================================================================
// Lambda Capture Default (lambda_capture_default) - constant constructors
// ============================================================================
export const MLTAG_LCD_None = 0;
export const MLTAG_LCD_ByCopy = 1;
export const MLTAG_LCD_ByRef = 2;

// ============================================================================
// Designator Kind - non-constant constructors
// ============================================================================
export const MLTAG_Designator_Field = 0;
export const MLTAG_Designator_Array = 1;
export const MLTAG_Designator_ArrayRange = 2;

// ============================================================================
// Offsetof Node Kind - non-constant constructors
// ============================================================================
export const MLTAG_Offsetof_Array = 0;
export const MLTAG_Offsetof_Field = 1;
export const MLTAG_Offsetof_Identifier = 2;

// ============================================================================
// Unary Operator Kind (unary_operator) - constant constructors
// ============================================================================
export const MLTAG_UO_PostInc = 0;
export const MLTAG_UO_PostDec = 1;
export const MLTAG_UO_PreInc = 2;
export const MLTAG_UO_PreDec = 3;
export const MLTAG_UO_AddrOf = 4;
export const MLTAG_UO_Deref = 5;
export const MLTAG_UO_Plus = 6;
export const MLTAG_UO_Minus = 7;
export const MLTAG_UO_Not = 8;
export const MLTAG_UO_LNot = 9;
export const MLTAG_UO_Real = 10;
export const MLTAG_UO_Imag = 11;
export const MLTAG_UO_Extension = 12;
export const MLTAG_UO_Coawait = 13;

// ============================================================================
// Binary Operator Kind (binary_operator) - constant constructors
// ============================================================================
export const MLTAG_BO_Mul = 0;
export const MLTAG_BO_Div = 1;
export const MLTAG_BO_Rem = 2;
export const MLTAG_BO_Add = 3;
export const MLTAG_BO_Sub = 4;
export const MLTAG_BO_Shl = 5;
export const MLTAG_BO_Shr = 6;
export const MLTAG_BO_LT = 7;
export const MLTAG_BO_GT = 8;
export const MLTAG_BO_LE = 9;
export const MLTAG_BO_GE = 10;
export const MLTAG_BO_EQ = 11;
export const MLTAG_BO_NE = 12;
export const MLTAG_BO_And = 13;
export const MLTAG_BO_Xor = 14;
export const MLTAG_BO_Or = 15;
export const MLTAG_BO_LAnd = 16;
export const MLTAG_BO_LOr = 17;
export const MLTAG_BO_Comma = 18;
export const MLTAG_BO_Assign = 19;
export const MLTAG_BO_PtrMemD = 20;
export const MLTAG_BO_PtrMemI = 21;

// ============================================================================
// Compound Assign Operator Kind - constant constructors
// ============================================================================
export const MLTAG_BO_MulAssign = 0;
export const MLTAG_BO_DivAssign = 1;
export const MLTAG_BO_RemAssign = 2;
export const MLTAG_BO_AddAssign = 3;
export const MLTAG_BO_SubAssign = 4;
export const MLTAG_BO_ShlAssign = 5;
export const MLTAG_BO_ShrAssign = 6;
export const MLTAG_BO_AndAssign = 7;
export const MLTAG_BO_XorAssign = 8;
export const MLTAG_BO_OrAssign = 9;

// ============================================================================
// Construction Kind (construction_kind) - constant constructors
// ============================================================================
export const MLTAG_CK_Complete = 0;
export const MLTAG_CK_NonVirtualBase = 1;
export const MLTAG_CK_VirtualBase = 2;
export const MLTAG_CK_Delegating = 3;

// ============================================================================
// Lambda Capture Kind (lambda_capture_kind) - constant constructors
// ============================================================================
export const MLTAG_LCK_This = 0;
export const MLTAG_LCK_StarThis = 1;
export const MLTAG_LCK_ByCopy = 2;
export const MLTAG_LCK_ByRef = 3;
export const MLTAG_LCK_VLAType = 4;

// ============================================================================
// Statement Kind (stmt_kind) - non-constant constructors
// ============================================================================
export const MLTAG_AsmStmt = 0;
export const MLTAG_AttributedStmt = 1;
export const MLTAG_BreakStmt = 2;
export const MLTAG_CompoundStmt = 3;
export const MLTAG_ContinueStmt = 4;
export const MLTAG_DeclStmt = 5;
export const MLTAG_DoStmt = 6;
export const MLTAG_Expr = 7;  // ExprStmt in OCaml
export const MLTAG_ForStmt = 8;
export const MLTAG_GotoStmt = 9;
export const MLTAG_IfStmt = 10;
export const MLTAG_IndirectGotoStmt = 11;
export const MLTAG_LabelStmt = 12;
export const MLTAG_ReturnStmt = 13;
export const MLTAG_CaseStmt = 14;
export const MLTAG_DefaultStmt = 15;
export const MLTAG_SwitchStmt = 16;
export const MLTAG_WhileStmt = 17;
// C++
export const MLTAG_CXXForRangeStmt = 18;
export const MLTAG_CXXTryStmt = 19;
// fallback
export const MLTAG_UnknownStmt = 20;

// Statement Kind - constant constructors (no args)
export const MLTAG_NullStmt = 0;

// ============================================================================
// ASM Style (asm_style) - constant constructors
// ============================================================================
export const MLTAG_ASM_STYLE_GCC = 0;
export const MLTAG_ASM_STYLE_MS = 1;

// ============================================================================
// ASM Output Constraint - constant constructors
// ============================================================================
export const MLTAG_ASM_OUTPUT_INOUT = 0;
export const MLTAG_ASM_OUTPUT_OUT = 1;

// ============================================================================
// Builtin Type (builtin_type) - constant constructors
// ============================================================================
export const MLTAG_Type_Void = 0;
export const MLTAG_Type_Bool = 1;
export const MLTAG_Type_Char_U = 2;
export const MLTAG_Type_UChar = 3;
export const MLTAG_Type_WChar_U = 4;
export const MLTAG_Type_Char16 = 5;
export const MLTAG_Type_Char32 = 6;
export const MLTAG_Type_UShort = 7;
export const MLTAG_Type_UInt = 8;
export const MLTAG_Type_ULong = 9;
export const MLTAG_Type_ULongLong = 10;
export const MLTAG_Type_UInt128 = 11;
export const MLTAG_Type_Char_S = 12;
export const MLTAG_Type_SChar = 13;
export const MLTAG_Type_WChar_S = 14;
export const MLTAG_Type_Short = 15;
export const MLTAG_Type_Int = 16;
export const MLTAG_Type_Long = 17;
export const MLTAG_Type_LongLong = 18;
export const MLTAG_Type_Int128 = 19;
export const MLTAG_Type_Half = 20;
export const MLTAG_Type_Float = 21;
export const MLTAG_Type_Double = 22;
export const MLTAG_Type_LongDouble = 23;
export const MLTAG_Type_Float128 = 24;
export const MLTAG_Type_NullPtr = 25;
export const MLTAG_Type_ObjCId = 26;
export const MLTAG_Type_ObjCClass = 27;
export const MLTAG_Type_ObjCSel = 28;
export const MLTAG_Type_OCLSampler = 29;
// Unknown builtin - non-constant
export const MLTAG_Type_unknown_builtin = 0;

// ============================================================================
// Type Kind (typ) - non-constant constructors
// ============================================================================
export const MLTAG_DecayedType = 0;
export const MLTAG_ArrayType = 1;
export const MLTAG_AtomicType = 2;
export const MLTAG_AttributedType = 3;
export const MLTAG_BuiltinType = 4;
export const MLTAG_ComplexType = 5;
export const MLTAG_FunctionProtoType = 6;
export const MLTAG_FunctionNoProtoType = 7;
export const MLTAG_ParenType = 8;
export const MLTAG_PointerType = 9;
export const MLTAG_EnumType = 10;
export const MLTAG_RecordType = 11;
export const MLTAG_TypedefType = 12;
export const MLTAG_ElaboratedType = 13;
export const MLTAG_UnaryTransformType = 14;
export const MLTAG_TypeOfExprType = 15;
export const MLTAG_TypeOfType = 16;
// C++
export const MLTAG_DecltypeType = 17;
export const MLTAG_AutoType = 18;
export const MLTAG_DeducedTemplateSpecializationType = 19;
export const MLTAG_DependentSizedExtVectorType = 20;
export const MLTAG_InjectedClassNameType = 21;
export const MLTAG_MemberPointerType = 22;
export const MLTAG_PackExpansionType = 23;
export const MLTAG_LValueReferenceType = 24;
export const MLTAG_RValueReferenceType = 25;
export const MLTAG_SubstTemplateTypeParmPackType = 26;
export const MLTAG_SubstTemplateTypeParmType = 27;
export const MLTAG_TemplateSpecializationType = 28;
export const MLTAG_TemplateTypeParmType = 29;
export const MLTAG_DependentNameType = 30;
export const MLTAG_DependentTemplateSpecializationType = 31;
export const MLTAG_UnresolvedUsingType = 32;
// Vectors
export const MLTAG_VectorType = 33;
// Unknown
export const MLTAG_UnknownType = 34;

// ============================================================================
// Array Size Modifier - constant constructors
// ============================================================================
export const MLTAG_SIZE_NORMAL = 0;
export const MLTAG_SIZE_STATIC = 1;
export const MLTAG_SIZE_STAR = 2;

// ============================================================================
// Array Size Kind - non-constant constructors
// ============================================================================
export const MLTAG_ConstantArrayType = 0;
export const MLTAG_VariableArrayType = 1;
// Constant constructors
export const MLTAG_IncompleteArrayType = 0;
export const MLTAG_DependentSizedArrayType = 1;

// ============================================================================
// Exception Specification Type - constant constructors
// ============================================================================
export const MLTAG_EST_None = 0;
export const MLTAG_EST_DynamicNone = 1;
export const MLTAG_EST_Dynamic = 2;
export const MLTAG_EST_MSAny = 3;
export const MLTAG_EST_BasicNoexcept = 4;
export const MLTAG_EST_ComputedNoexcept = 5;
export const MLTAG_EST_Unevaluated = 6;
export const MLTAG_EST_Uninstantiated = 7;
export const MLTAG_EST_Unparsed = 8;
export const MLTAG_EST_DependentNoexcept = 9;
export const MLTAG_EST_NoexceptFalse = 10;
export const MLTAG_EST_NoexceptTrue = 11;

// ============================================================================
// Noexcept Result - constant constructors
// ============================================================================
export const MLTAG_NR_NoNoexcept = 0;
export const MLTAG_NR_BadNoexcept = 1;
export const MLTAG_NR_Dependent = 2;
export const MLTAG_NR_Throw = 3;
export const MLTAG_NR_Nothrow = 4;

// ============================================================================
// Ref Qualifier Kind - constant constructors
// ============================================================================
export const MLTAG_RQ_None = 0;
export const MLTAG_RQ_LValue = 1;
export const MLTAG_RQ_RValue = 2;

// ============================================================================
// Tag Type Kind (record_kind) - constant constructors
// ============================================================================
export const MLTAG_TTK_Struct = 0;
export const MLTAG_TTK_Union = 1;
export const MLTAG_TTK_Class = 2;
export const MLTAG_TTK_Interface = 3;

// ============================================================================
// Diagnostic Level - constant constructors
// ============================================================================
export const MLTAG_Level_Ignored = 0;
export const MLTAG_Level_Note = 1;
export const MLTAG_Level_Remark = 2;
export const MLTAG_Level_Warning = 3;
export const MLTAG_Level_Error = 4;
export const MLTAG_Level_Fatal = 5;

// ============================================================================
// Target EABI - constant constructors
// ============================================================================
export const MLTAG_Target_EABI_Unknown = 0;
export const MLTAG_Target_EABI_Default = 1;
export const MLTAG_Target_EABI_EABI4 = 2;
export const MLTAG_Target_EABI_EABI5 = 3;
export const MLTAG_Target_EABI_GNU = 4;

// ============================================================================
// Overloaded Operator Kind - constant constructors
// ============================================================================
export const MLTAG_OO_New = 0;
export const MLTAG_OO_Delete = 1;
export const MLTAG_OO_Array_New = 2;
export const MLTAG_OO_Array_Delete = 3;
export const MLTAG_OO_Plus = 4;
export const MLTAG_OO_Minus = 5;
export const MLTAG_OO_Star = 6;
export const MLTAG_OO_Slash = 7;
export const MLTAG_OO_Percent = 8;
export const MLTAG_OO_Caret = 9;
export const MLTAG_OO_Amp = 10;
export const MLTAG_OO_Pipe = 11;
export const MLTAG_OO_Tilde = 12;
export const MLTAG_OO_Exclaim = 13;
export const MLTAG_OO_Equal = 14;
export const MLTAG_OO_Less = 15;
export const MLTAG_OO_Greater = 16;
export const MLTAG_OO_PlusEqual = 17;
export const MLTAG_OO_MinusEqual = 18;
export const MLTAG_OO_StarEqual = 19;
export const MLTAG_OO_SlashEqual = 20;
export const MLTAG_OO_PercentEqual = 21;
export const MLTAG_OO_CaretEqual = 22;
export const MLTAG_OO_AmpEqual = 23;
export const MLTAG_OO_PipeEqual = 24;
export const MLTAG_OO_LessLess = 25;
export const MLTAG_OO_GreaterGreater = 26;
export const MLTAG_OO_LessLessEqual = 27;
export const MLTAG_OO_GreaterGreaterEqual = 28;
export const MLTAG_OO_EqualEqual = 29;
export const MLTAG_OO_ExclaimEqual = 30;
export const MLTAG_OO_LessEqual = 31;
export const MLTAG_OO_GreaterEqual = 32;
export const MLTAG_OO_Spaceship = 33;
export const MLTAG_OO_AmpAmp = 34;
export const MLTAG_OO_PipePipe = 35;
export const MLTAG_OO_PlusPlus = 36;
export const MLTAG_OO_MinusMinus = 37;
export const MLTAG_OO_Comma = 38;
export const MLTAG_OO_ArrowStar = 39;
export const MLTAG_OO_Arrow = 40;
export const MLTAG_OO_Call = 41;
export const MLTAG_OO_Subscript = 42;
export const MLTAG_OO_Conditional = 43;
