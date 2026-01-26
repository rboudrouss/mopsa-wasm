/**
 * Clang JSON AST Type Definitions
 * 
 * TypeScript interfaces matching Clang's -ast-dump=json output format.
 * Based on llvm-project/clang/lib/AST/JSONNodeDumper.cpp
 */

// ============================================================================
// Source Locations
// ============================================================================

export interface SourceLocation {
    offset?: number;
    file?: string;
    line?: number;
    col?: number;
    tokLen?: number;
    includedFrom?: { file: string };
    spellingLoc?: SourceLocation;
    expansionLoc?: SourceLocation & { isMacroArgExpansion?: boolean };
}

export interface SourceRange {
    begin: SourceLocation;
    end: SourceLocation;
}

// ============================================================================
// Type Representations
// ============================================================================

export interface QualType {
    qualType: string;
    desugaredQualType?: string;
    typeAliasDeclId?: string;
}

// ============================================================================
// Base AST Node
// ============================================================================

export interface ASTNode {
    id: string;           // Pointer representation like "0x..."
    kind: string;         // Node kind like "FunctionDecl", "IntegerLiteral"
    loc?: SourceLocation;
    range?: SourceRange;
    type?: QualType;      // Type information (present on expressions and some declarations)
    name?: string;        // Name (for declarations like FunctionDecl, VarDecl, etc.)
    mangledName?: string; // Mangled name (for functions)
    value?: string | number;  // Value for literals (string for most, number for CharacterLiteral)
    isImplicit?: boolean;
    isInvalid?: boolean;
    isUsed?: boolean;
    isReferenced?: boolean;
    inner?: ASTNode[];    // Child nodes
}

// ============================================================================
// Declaration Nodes
// ============================================================================

export interface DeclNode extends ASTNode {
    name?: string;
    mangledName?: string;
    type?: QualType;
    storageClass?: string;  // "static", "extern", etc.
    isHidden?: boolean;
    parentDeclContext?: string;
    previousDecl?: string;
}

export interface TranslationUnitDecl extends DeclNode {
    kind: "TranslationUnitDecl";
}

export interface FunctionDecl extends DeclNode {
    kind: "FunctionDecl";
    variadic?: boolean;
    inline?: boolean;
    virtual?: boolean;
    pure?: boolean;
    explicitlyDeleted?: boolean;
    explicitlyDefaulted?: string;
    constexpr?: boolean;
}

export interface VarDecl extends DeclNode {
    kind: "VarDecl";
    init?: "c" | "call" | "list";  // initialization style
    isNRVOVariable?: boolean;
    isParameterPack?: boolean;
    constexpr?: boolean;
}

export interface ParmVarDecl extends DeclNode {
    kind: "ParmVarDecl";
}

export interface FieldDecl extends DeclNode {
    kind: "FieldDecl";
    isBitfield?: boolean;
    isMutable?: boolean;
}

export interface RecordDecl extends DeclNode {
    kind: "RecordDecl" | "CXXRecordDecl";
    tagUsed?: "struct" | "union" | "class";
    completeDefinition?: boolean;
    definitionData?: CXXRecordDefinitionData;
    bases?: CXXBaseSpecifier[];
}

export interface CXXRecordDefinitionData {
    isGenericLambda?: boolean;
    isLambda?: boolean;
    isEmpty?: boolean;
    isAggregate?: boolean;
    isStandardLayout?: boolean;
    isTriviallyCopyable?: boolean;
    isPOD?: boolean;
    isTrivial?: boolean;
    isPolymorphic?: boolean;
    isAbstract?: boolean;
    isLiteral?: boolean;
    canPassInRegisters?: boolean;
    hasUserDeclaredConstructor?: boolean;
    hasConstexprNonCopyMoveConstructor?: boolean;
    hasMutableFields?: boolean;
    hasVariantMembers?: boolean;
}

export interface CXXBaseSpecifier {
    type: QualType;
    access: "public" | "protected" | "private";
    isVirtual?: boolean;
    writtenAccess?: string;
}

export interface EnumDecl extends DeclNode {
    kind: "EnumDecl";
    fixedUnderlyingType?: QualType;
    scopedEnumTag?: "class" | "struct";
}

export interface EnumConstantDecl extends DeclNode {
    kind: "EnumConstantDecl";
}

export interface TypedefDecl extends DeclNode {
    kind: "TypedefDecl" | "TypeAliasDecl";
}

export interface LabelDecl extends DeclNode {
    kind: "LabelDecl";
}

// ============================================================================
// Statement Nodes
// ============================================================================

export interface StmtNode extends ASTNode {
    // Base for all statements
}

export interface CompoundStmt extends StmtNode {
    kind: "CompoundStmt";
}

export interface DeclStmt extends StmtNode {
    kind: "DeclStmt";
}

export interface ReturnStmt extends StmtNode {
    kind: "ReturnStmt";
}

export interface IfStmt extends StmtNode {
    kind: "IfStmt";
    hasInit?: boolean;
    hasVar?: boolean;
    hasElse?: boolean;
    isConstexpr?: boolean;
}

export interface WhileStmt extends StmtNode {
    kind: "WhileStmt";
    hasVar?: boolean;
}

export interface DoStmt extends StmtNode {
    kind: "DoStmt";
}

export interface ForStmt extends StmtNode {
    kind: "ForStmt";
}

export interface BreakStmt extends StmtNode {
    kind: "BreakStmt";
}

export interface ContinueStmt extends StmtNode {
    kind: "ContinueStmt";
}

export interface SwitchStmt extends StmtNode {
    kind: "SwitchStmt";
    hasInit?: boolean;
    hasVar?: boolean;
}

export interface CaseStmt extends StmtNode {
    kind: "CaseStmt";
}

export interface DefaultStmt extends StmtNode {
    kind: "DefaultStmt";
}

export interface GotoStmt extends StmtNode {
    kind: "GotoStmt";
    targetLabelDeclId?: string;
}

export interface LabelStmt extends StmtNode {
    kind: "LabelStmt";
    name?: string;
    declId?: string;
}

export interface NullStmt extends StmtNode {
    kind: "NullStmt";
}

// ============================================================================
// Expression Nodes
// ============================================================================

export interface ExprNode extends ASTNode {
    type?: QualType;
    valueCategory?: "lvalue" | "xvalue" | "rvalue";
}

export interface IntegerLiteral extends ExprNode {
    kind: "IntegerLiteral";
    value: string;
}

export interface FloatingLiteral extends ExprNode {
    kind: "FloatingLiteral";
    value: string;
}

export interface CharacterLiteral extends ExprNode {
    kind: "CharacterLiteral";
    value: number;
}

export interface StringLiteral extends ExprNode {
    kind: "StringLiteral";
    value: string;
}

export interface DeclRefExpr extends ExprNode {
    kind: "DeclRefExpr";
    referencedDecl?: DeclRef;
    foundReferencedDecl?: DeclRef;
    nonOdrUseReason?: string;
}

export interface DeclRef {
    id: string;
    kind: string;
    name?: string;
    type?: QualType;
}

export interface BinaryOperator extends ExprNode {
    kind: "BinaryOperator";
    opcode: string;  // "+", "-", "*", "/", "=", "==", etc.
}

export interface CompoundAssignOperator extends ExprNode {
    kind: "CompoundAssignOperator";
    opcode: string;  // "+=", "-=", etc.
    computeLHSType?: QualType;
    computeResultType?: QualType;
}

export interface UnaryOperator extends ExprNode {
    kind: "UnaryOperator";
    opcode: string;  // "++", "--", "&", "*", "-", "!", etc.
    isPostfix?: boolean;
    canOverflow?: boolean;
}

export interface CallExpr extends ExprNode {
    kind: "CallExpr";
}

export interface MemberExpr extends ExprNode {
    kind: "MemberExpr";
    name?: string;
    isArrow?: boolean;
    referencedMemberDecl?: string;
    nonOdrUseReason?: string;
}

export interface ArraySubscriptExpr extends ExprNode {
    kind: "ArraySubscriptExpr";
}

export interface CastExpr extends ExprNode {
    castKind: string;  // "LValueToRValue", "IntegralCast", etc.
    path?: CastPath[];
    conversionFunc?: DeclRef;
}

export interface CastPath {
    name: string;
    isVirtual?: boolean;
}

export interface ImplicitCastExpr extends CastExpr {
    kind: "ImplicitCastExpr";
    isPartOfExplicitCast?: boolean;
}

export interface CStyleCastExpr extends CastExpr {
    kind: "CStyleCastExpr";
}

export interface ParenExpr extends ExprNode {
    kind: "ParenExpr";
}

export interface ConditionalOperator extends ExprNode {
    kind: "ConditionalOperator";
}

export interface InitListExpr extends ExprNode {
    kind: "InitListExpr";
    field?: DeclRef;
}

export interface ImplicitValueInitExpr extends ExprNode {
    kind: "ImplicitValueInitExpr";
}

export interface UnaryExprOrTypeTraitExpr extends ExprNode {
    kind: "UnaryExprOrTypeTraitExpr";
    name: "sizeof" | "alignof" | "__alignof";
    argType?: QualType;
}

export interface OffsetOfExpr extends ExprNode {
    kind: "OffsetOfExpr";
}

export interface CompoundLiteralExpr extends ExprNode {
    kind: "CompoundLiteralExpr";
}

export interface DesignatedInitExpr extends ExprNode {
    kind: "DesignatedInitExpr";
}

export interface StmtExpr extends ExprNode {
    kind: "StmtExpr";
}

export interface VAArgExpr extends ExprNode {
    kind: "VAArgExpr";
}

export interface GenericSelectionExpr extends ExprNode {
    kind: "GenericSelectionExpr";
}

export interface AtomicExpr extends ExprNode {
    kind: "AtomicExpr";
    name: string;
}

export interface PredefinedExpr extends ExprNode {
    kind: "PredefinedExpr";
    name: string;  // "__func__", "__FUNCTION__", etc.
}

export interface ConstantExpr extends ExprNode {
    kind: "ConstantExpr";
    value?: string;
}

export interface GNUNullExpr extends ExprNode {
    kind: "GNUNullExpr";
}

// ============================================================================
// Type Nodes (when types are dumped as nodes)
// ============================================================================

export interface TypeNode extends ASTNode {
    type?: QualType;
    isDependent?: boolean;
    isInstantiationDependent?: boolean;
    isVariablyModified?: boolean;
    containsUnexpandedPack?: boolean;
    isImported?: boolean;
}

export interface BuiltinType extends TypeNode {
    kind: "BuiltinType";
}

export interface PointerType extends TypeNode {
    kind: "PointerType";
}

export interface ArrayType extends TypeNode {
    kind: "ConstantArrayType" | "VariableArrayType" | "IncompleteArrayType";
    size?: number;
}

export interface FunctionProtoType extends TypeNode {
    kind: "FunctionProtoType";
    cc?: string;  // calling convention
}

export interface RecordType extends TypeNode {
    kind: "RecordType";
    decl?: DeclRef;
}

export interface EnumType extends TypeNode {
    kind: "EnumType";
    decl?: DeclRef;
}

export interface TypedefType extends TypeNode {
    kind: "TypedefType";
    decl?: DeclRef;
}

export interface ElaboratedType extends TypeNode {
    kind: "ElaboratedType";
    ownedTagDecl?: DeclRef;
}

export interface ParenType extends TypeNode {
    kind: "ParenType";
}

export interface AttributedType extends TypeNode {
    kind: "AttributedType";
}

export interface DecayedType extends TypeNode {
    kind: "DecayedType";
}

// ============================================================================
// Attribute Nodes
// ============================================================================

export interface AttrNode extends ASTNode {
    inherited?: boolean;
    implicit?: boolean;
}

// ============================================================================
// Comment Nodes
// ============================================================================

export interface CommentNode extends ASTNode {
    // Comment-specific fields
}

// ============================================================================
// Helper type for any AST node
// ============================================================================

export type ClangASTNode =
    | TranslationUnitDecl
    | FunctionDecl
    | VarDecl
    | ParmVarDecl
    | FieldDecl
    | RecordDecl
    | EnumDecl
    | EnumConstantDecl
    | TypedefDecl
    | LabelDecl
    | CompoundStmt
    | DeclStmt
    | ReturnStmt
    | IfStmt
    | WhileStmt
    | DoStmt
    | ForStmt
    | BreakStmt
    | ContinueStmt
    | SwitchStmt
    | CaseStmt
    | DefaultStmt
    | GotoStmt
    | LabelStmt
    | NullStmt
    | IntegerLiteral
    | FloatingLiteral
    | CharacterLiteral
    | StringLiteral
    | DeclRefExpr
    | BinaryOperator
    | CompoundAssignOperator
    | UnaryOperator
    | CallExpr
    | MemberExpr
    | ArraySubscriptExpr
    | ImplicitCastExpr
    | CStyleCastExpr
    | ParenExpr
    | ConditionalOperator
    | InitListExpr
    | ImplicitValueInitExpr
    | UnaryExprOrTypeTraitExpr
    | ConstantExpr
    | ASTNode;  // Fallback for unknown nodes

