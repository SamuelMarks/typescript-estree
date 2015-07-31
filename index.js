/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/typescript/bin/typescript.d.ts" />
/// <reference path="typings/estree/estree.d.ts" />
/// <reference path="typings/estree/flow.d.ts" />
var ts = require('typescript');
var SyntaxName = ts.SyntaxKind;
// patch SyntaxName in order to provide better names in debug
[
    'FirstAssignment',
    'LastAssignment',
    'FirstReservedWord',
    'LastReservedWord',
    'FirstKeyword',
    'LastKeyword',
    'FirstFutureReservedWord',
    'LastFutureReservedWord',
    'FirstTypeNode',
    'LastTypeNode',
    'FirstPunctuation',
    'LastPunctuation',
    'FirstToken',
    'LastToken',
    'FirstTriviaToken',
    'LastTriviaToken',
    'FirstLiteralToken',
    'LastLiteralToken',
    'FirstTemplateToken',
    'LastTemplateToken',
    'FirstBinaryOperator',
    'LastBinaryOperator',
    'FirstNode'
].forEach(function (aliasName) {
    var kind = ts.SyntaxKind[aliasName];
    for (var properName in SyntaxName) {
        if (aliasName !== properName && ts.SyntaxKind[properName] === kind) {
            SyntaxName[kind] = properName;
            return;
        }
    }
});
function convertPosition(sourceFile, pos) {
    var _a = sourceFile.getLineAndCharacterOfPosition(pos), line = _a.line, column = _a.character;
    return { line: line, column: column };
}
function unexpected(node) {
    var _a = convertPosition(node.getSourceFile(), node.pos), line = _a.line, column = _a.column;
    throw new TypeError("Unexpected node type " + SyntaxName[node.kind] + " (" + line + ":" + column + ")");
}
function wrapPos(sourceFile, range, props) {
    props.loc = {
        source: sourceFile.fileName,
        start: convertPosition(sourceFile, range.pos),
        end: convertPosition(sourceFile, range.end)
    };
    props.range = [range.pos, range.end];
    return props;
}
function wrap(node, props) {
    return wrapPos(node.getSourceFile(), node, props);
}
function convertNullable(node, convert) {
    return node != null ? convert(node) : null;
}
function convertClassDeclaration(node) {
    var superClass = null;
    node.heritageClauses.some(function (clause) {
        if (clause.token === 79 /* ExtendsKeyword */) {
            superClass = convertExpression(clause.types[0].expression);
            return true;
        }
        else {
            return false;
        }
    });
    return wrap(node, {
        type: 'ClassDeclaration',
        id: convertIdentifier(node.name),
        superClass: superClass,
        body: wrapPos(node.getSourceFile(), node.members, {
            type: 'ClassBody',
            body: node.members.map(convertClassElement)
        })
    });
}
function convertClassElement(node) {
    if (node.kind === 141 /* IndexSignature */) {
        // TODO
        return null;
    }
    return convertFunctionLikeClassElement(node);
}
function convertFunctionLikeClassElement(node) {
    var kind;
    switch (node.kind) {
        case 135 /* MethodDeclaration */:
            kind = 'method';
            break;
        case 136 /* Constructor */:
            kind = 'constructor';
            break;
        case 137 /* GetAccessor */:
            kind = 'get';
            break;
        case 138 /* SetAccessor */:
            kind = 'set';
            break;
        default: unexpected(node);
    }
    return wrap(node, {
        type: 'MethodDefinition',
        kind: kind,
        key: convertDeclarationName(node.name),
        value: convertFunctionLikeDeclaration(node),
        computed: node.name.kind === 128 /* ComputedPropertyName */,
        static: !!(node.flags & 128 /* Static */)
    });
}
function convertObjectBindingPattern(node) {
    return wrap(node, {
        type: 'ObjectPattern',
        properties: node.elements.map(convertObjectBindingElement)
    });
}
function convertIdentifierOrBindingPattern(node) {
    return node.kind === 65 /* Identifier */
        ? convertIdentifier(node)
        : convertBindingPattern(node);
}
function convertArrayBindingElement(node) {
    convertIdentifier;
    var name = convertDeclarationName(node.name);
    if (node.dotDotDotToken) {
        return wrap(node, {
            type: 'RestElement',
            argument: name
        });
    }
    else if (node.initializer) {
        return wrap(node, {
            type: 'AssignmentPattern',
            left: name,
            right: convertExpression(node.initializer)
        });
    }
    else {
        return name;
    }
}
function convertArrayBindingPattern(node) {
    return wrap(node, {
        type: 'ArrayPattern',
        elements: node.elements.map(convertArrayBindingElement)
    });
}
function convertBindingPattern(node) {
    switch (node.kind) {
        case 151 /* ObjectBindingPattern */:
            return convertObjectBindingPattern(node);
        case 152 /* ArrayBindingPattern */:
            return convertArrayBindingPattern(node);
        default:
            unexpected(node);
    }
}
function convertDeclarationName(node) {
    switch (node.kind) {
        case 128 /* ComputedPropertyName */:
            return convertExpression(node.expression);
        case 151 /* ObjectBindingPattern */:
        case 152 /* ArrayBindingPattern */:
            return convertBindingPattern(node);
        default:
            return convertExpression(node);
    }
}
function convertPropertyDeclaration(node) {
    // TODO
    return null;
}
function convertLiteral(node) {
    var raw = node.getText();
    switch (node.kind) {
        case 80 /* FalseKeyword */:
        case 95 /* TrueKeyword */:
            return wrap(node, {
                type: 'Literal',
                value: node.kind === 95 /* TrueKeyword */,
                raw: raw
            });
        case 7 /* NumericLiteral */:
            return wrap(node, {
                type: 'Literal',
                value: Number(node.text),
                raw: raw
            });
        case 8 /* StringLiteral */:
            return wrap(node, {
                type: 'Literal',
                value: node.text,
                raw: raw
            });
        case 9 /* RegularExpressionLiteral */: {
            var _a = raw.match(/^\/(.*)\/([a-z]*)$/), pattern = _a[1], flags = _a[2];
            return wrap(node, {
                type: 'Literal',
                value: new RegExp(node.text),
                raw: raw,
                regex: {
                    pattern: pattern,
                    flags: flags
                }
            });
        }
        case 89 /* NullKeyword */:
            return wrap(node, {
                type: 'Literal',
                value: null,
                raw: raw
            });
        default:
            unexpected(node);
    }
}
function convertExpressionStatement(node) {
    return wrap(node, {
        type: 'ExpressionStatement',
        expression: convertExpression(node.expression)
    });
}
function convertTopStatement(node) {
    switch (node.kind) {
        default:
            return convertStatement(node);
    }
}
function convertStatement(node) {
    switch (node.kind) {
        case 180 /* Block */:
            return convertBlock(node);
        case 181 /* VariableStatement */:
            return convertVariableStatement(node);
        case 194 /* SwitchStatement */:
            return convertSwitchStatement(node);
        case 197 /* TryStatement */:
            return convertTryStatement(node);
        case 201 /* FunctionDeclaration */:
            return convertFunctionDeclaration(node);
        case 202 /* ClassDeclaration */:
            return convertClassDeclaration(node);
        case 198 /* DebuggerStatement */:
            return wrap(node, { type: 'DebuggerStatement' });
        case 182 /* EmptyStatement */:
            return wrap(node, { type: 'EmptyStatement' });
        case 191 /* BreakStatement */:
        case 190 /* ContinueStatement */:
            return convertBreakOrContinuteStatement(node);
        case 192 /* ReturnStatement */:
            return convertReturnStatement(node);
        case 195 /* LabeledStatement */:
            return convertLabeledStatement(node);
        case 196 /* ThrowStatement */:
            return convertThrowStatement(node);
        case 183 /* ExpressionStatement */:
            return convertExpressionStatement(node);
        case 193 /* WithStatement */:
            return convertWithStatement(node);
        case 188 /* ForInStatement */:
            return convertForInStatement(node);
        case 187 /* ForStatement */:
            return convertForStatement(node);
        case 186 /* WhileStatement */:
        case 185 /* DoStatement */:
            return convertWhileStatement(node);
        case 184 /* IfStatement */:
            return convertIfStatement(node);
        default:
            unexpected(node);
    }
}
function convertThrowStatement(node) {
    return wrap(node, {
        type: 'ThrowStatement',
        argument: convertExpression(node.expression)
    });
}
function convertBreakOrContinuteStatement(node) {
    return wrap(node, {
        type: node.kind === 191 /* BreakStatement */ ? 'BreakStatement' : 'ContinueStatement',
        label: convertNullable(node.label, convertIdentifier)
    });
}
function convertReturnStatement(node) {
    return wrap(node, {
        type: 'ReturnStatement',
        argument: convertNullable(node.expression, convertExpression)
    });
}
function convertExpression(node) {
    switch (node.kind) {
        case 176 /* OmittedExpression */:
            return null;
        case 93 /* ThisKeyword */:
            return wrap(node, { type: 'ThisExpression' });
        case 65 /* Identifier */:
            return convertIdentifier(node);
        case 170 /* BinaryExpression */:
            return convertBinaryExpression(node);
        case 168 /* PrefixUnaryExpression */:
        case 169 /* PostfixUnaryExpression */:
            return convertPrefixOrPostfixUnaryExpression(node);
        case 165 /* DeleteExpression */:
        case 166 /* TypeOfExpression */:
        case 167 /* VoidExpression */:
            return convertNamedUnaryExpression(node);
        case 171 /* ConditionalExpression */:
            return convertConditionalExpression(node);
        case 158 /* CallExpression */:
        case 159 /* NewExpression */:
            return convertCallOrNewExpression(node);
        case 162 /* ParenthesizedExpression */:
            return convertExpression(node.expression);
        case 154 /* ArrayLiteralExpression */:
            return convertArrayLiteralExpression(node);
        case 155 /* ObjectLiteralExpression */:
            return convertObjectLiteralExpression(node);
        case 164 /* ArrowFunction */:
        case 163 /* FunctionExpression */:
            return convertFunctionLikeDeclaration(node);
        case 156 /* PropertyAccessExpression */:
            return convertPropertyAccessExpression(node);
        case 157 /* ElementAccessExpression */:
            return convertElementAccessExpression(node);
        default:
            return convertLiteral(node);
    }
}
function convertPropertyAccessExpression(node) {
    return wrap(node, {
        type: 'MemberExpression',
        object: convertExpression(node.expression),
        property: convertIdentifier(node.name),
        computed: false
    });
}
function convertElementAccessExpression(node) {
    return wrap(node, {
        type: 'MemberExpression',
        object: convertExpression(node.expression),
        property: convertExpression(node.argumentExpression),
        computed: true
    });
}
function convertSourceFile(node) {
    return wrap(node, {
        type: 'Program',
        body: node.statements.map(convertTopStatement),
        sourceType: 'module'
    });
}
exports.convertSourceFile = convertSourceFile;
function checkAndConvert(input, options) {
    options = options ? ts.clone(options) : ts.getDefaultCompilerOptions();
    options.noLib = true;
    options.noResolve = true;
    var inputFileName = "module.ts";
    var sourceFile = ts.createSourceFile(inputFileName, input, options.target);
    // Create a compilerHost object to allow the compiler to read and write files
    var program = ts.createProgram([inputFileName], options, {
        getSourceFile: function (fileName, target) { return fileName === inputFileName ? sourceFile : undefined; },
        writeFile: function (name, text, writeByteOrderMark) {
            throw new Error("Not implemented");
        },
        getDefaultLibFileName: function () { return "lib.d.ts"; },
        useCaseSensitiveFileNames: function () { return true; },
        getCanonicalFileName: function (fileName) { return fileName; },
        getCurrentDirectory: function () { return ""; },
        getNewLine: function () { return "\n"; }
    });
    /*
    var diag: Array<ts.Diagnostic> = []
        .concat(program.getSyntacticDiagnostics())
        .concat(program.getSemanticDiagnostics())
        .concat(program.getDeclarationDiagnostics());
    if (diag.length) {
        let { line, column } = convertPosition(diag[0].file, diag[0].start);
        console.warn(`${ts.flattenDiagnosticMessageText(diag[0].messageText, '\n')} at ${line}:${column}`);
    }
    */
    program.getSemanticDiagnostics();
    convertSourceFile(sourceFile);
}
exports.checkAndConvert = checkAndConvert;
function convertVariableStatement(node) {
    var _a = node.declarationList, flags = _a.flags, declarations = _a.declarations;
    return wrap(node, {
        type: 'VariableDeclaration',
        kind: (flags & 8192 /* Const */) ? 'const' : (flags & 4096 /* Let */) ? 'let' : 'var',
        declarations: declarations.map(convertVariableDeclaration)
    });
}
function convertVariableDeclaration(node) {
    return wrap(node, {
        type: 'VariableDeclarator',
        id: convertDeclarationName(node.name),
        init: convertNullable(node.initializer, convertExpression)
    });
}
function convertSwitchStatement(node) {
    return wrap(node, {
        type: 'SwitchStatement',
        discriminant: convertExpression(node.expression),
        cases: node.caseBlock.clauses.map(convertCaseOrDefaultClause)
    });
}
function convertCaseOrDefaultClause(node) {
    return wrap(node, {
        type: 'SwitchCase',
        test: node.kind === 221 /* CaseClause */ ? convertExpression(node.expression) : null,
        consequent: node.statements.map(convertStatement)
    });
}
function convertLabeledStatement(node) {
    return wrap(node, {
        type: 'LabeledStatement',
        label: convertIdentifier(node.label),
        body: convertStatement(node.statement)
    });
}
function convertIdentifier(node) {
    return wrap(node, {
        type: 'Identifier',
        name: node.text
    });
}
function convertBlock(node) {
    return wrap(node, {
        type: 'BlockStatement',
        body: node.statements.map(convertStatement)
    });
}
function convertTryStatement(node) {
    return wrap(node, {
        type: 'TryStatement',
        block: convertBlock(node.tryBlock),
        handler: convertNullable(node.catchClause, convertCatchClause),
        finalizer: convertNullable(node.finallyBlock, convertBlock)
    });
}
function convertCatchClause(node) {
    return wrap(node, {
        type: 'CatchClause',
        param: convertDeclarationName(node.variableDeclaration.name),
        body: convertBlock(node.block)
    });
}
function convertYieldExpression(node) {
    return wrap(node, {
        type: 'YieldExpression',
        argument: convertExpression(node.expression),
        delegate: !!node.asteriskToken
    });
}
function convertPrefixOrPostfixUnaryExpression(node) {
    var operator = tryConvertUpdateOperator(node.operator);
    var isUnary = operator === undefined;
    if (isUnary) {
        operator = convertUnaryOperator(node.operator);
    }
    return wrap(node, {
        type: isUnary ? 'UnaryExpression' : 'UpdateExpression',
        operator: operator,
        prefix: node.kind === 168 /* PrefixUnaryExpression */,
        argument: convertExpression(node.operand)
    });
}
function convertNamedUnaryExpression(node) {
    var operator;
    switch (node.kind) {
        case 165 /* DeleteExpression */:
            operator = "delete";
            break;
        case 166 /* TypeOfExpression */:
            operator = "typeof";
            break;
        case 167 /* VoidExpression */:
            operator = "void";
            break;
        default:
            unexpected(node);
    }
    return wrap(node, {
        type: 'UnaryExpression',
        operator: operator,
        prefix: true,
        argument: convertExpression(node.expression)
    });
}
function convertBinaryExpression(node) {
    if (node.operatorToken.kind === 49 /* BarBarToken */ || node.operatorToken.kind === 48 /* AmpersandAmpersandToken */) {
        return wrap(node, {
            type: 'LogicalExpression',
            operator: node.operatorToken.getText(),
            left: convertExpression(node.left),
            right: convertExpression(node.right)
        });
    }
    return wrap(node, {
        type: 'BinaryExpression',
        operator: node.operatorToken.getText(),
        left: convertExpression(node.left),
        right: convertExpression(node.right)
    });
}
function convertConditionalExpression(node) {
    return wrap(node, {
        type: 'ConditionalExpression',
        test: convertExpression(node.condition),
        consequent: convertExpression(node.whenTrue),
        alternate: convertExpression(node.whenFalse)
    });
}
function convertFunctionLikeDeclaration(node) {
    return wrap(node, {
        type: 'FunctionExpression',
        id: node.name ? convertIdentifier(node.name) : null,
        params: node.parameters.map(convertParameterDeclaration),
        body: convertFunctionBody(node.body),
        generator: !!node.asteriskToken
    });
}
function convertFunctionDeclaration(node) {
    return wrap(node, {
        type: 'FunctionDeclaration',
        id: convertIdentifier(node.name),
        params: node.parameters.map(convertParameterDeclaration),
        body: convertBlock(node.body),
        generator: !!node.asteriskToken
    });
}
function convertFunctionBody(node) {
    return node.kind === 180 /* Block */ ? convertBlock(node) : convertExpression(node);
}
function convertParameterDeclaration(node) {
    var name = convertDeclarationName(node.name);
    if (node.dotDotDotToken) {
        return wrap(node, {
            type: 'RestElement',
            argument: name
        });
    }
    else if (node.initializer) {
        return wrap(node, {
            type: 'AssignmentPattern',
            left: name,
            right: convertExpression(node.initializer)
        });
    }
    else {
        return name;
    }
}
function convertIfStatement(node) {
    return wrap(node, {
        type: 'IfStatement',
        test: convertExpression(node.expression),
        consequent: convertStatement(node.thenStatement),
        alternate: convertNullable(node.elseStatement, convertStatement)
    });
}
function convertWhileStatement(node) {
    return wrap(node, {
        type: node.kind === 186 /* WhileStatement */ ? 'WhileStatement' : 'DoWhileStatement',
        test: convertExpression(node.expression),
        body: convertStatement(node.statement)
    });
}
function convertVariableDeclarationOrExpression(node) {
    return node.kind === 200 /* VariableDeclarationList */
        ? wrapPos(node.getSourceFile(), node, {
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: node.declarations.map(convertVariableDeclaration)
        })
        : convertExpression(node);
}
function convertForStatement(node) {
    return wrap(node, {
        type: 'ForStatement',
        init: convertNullable(node.initializer, convertVariableDeclarationOrExpression),
        test: convertNullable(node.condition, convertExpression),
        update: convertNullable(node.incrementor, convertExpression),
        body: convertStatement(node.statement)
    });
}
function convertForInStatement(node) {
    return wrap(node, {
        type: 'ForInStatement',
        left: convertVariableDeclarationOrExpression(node.initializer),
        right: convertExpression(node.expression),
        body: convertStatement(node.statement)
    });
}
function convertWithStatement(node) {
    return wrap(node, {
        type: 'WithStatement',
        object: convertExpression(node.expression),
        body: convertStatement(node.statement)
    });
}
function convertCallOrNewExpression(node) {
    return wrap(node, {
        type: node.kind === 158 /* CallExpression */ ? 'CallExpression' : 'NewExpression',
        callee: convertExpression(node.expression),
        arguments: node.arguments ? node.arguments.map(convertExpression) : []
    });
}
function convertArrayLiteralExpression(node) {
    return wrap(node, {
        type: 'ArrayExpression',
        elements: node.elements.map(convertExpression)
    });
}
function convertObjectLiteralExpression(node) {
    return wrap(node, {
        type: 'ObjectExpression',
        properties: node.properties.map(convertObjectLiteralElement)
    });
}
function convertObjectLiteralElement(node) {
    switch (node.kind) {
        case 226 /* ShorthandPropertyAssignment */:
        case 225 /* PropertyAssignment */:
        case 135 /* MethodDeclaration */:
            return convertObjectLiteralPropertyElement(node);
        case 137 /* GetAccessor */:
        case 138 /* SetAccessor */:
            return convertObjectLiteralFunctionLikeElement(node);
        default:
            unexpected(node);
    }
}
function convertObjectLiteralPropertyElement(node) {
    var isShorthand = node.kind === 226 /* ShorthandPropertyAssignment */;
    return wrap(node, {
        type: 'Property',
        key: convertDeclarationName(node.name),
        value: (isShorthand
            ? convertIdentifier(node.name)
            : convertExpression(node.initializer)),
        kind: 'init',
        method: false,
        shorthand: isShorthand,
        computed: node.name.kind === 128 /* ComputedPropertyName */
    });
}
function convertObjectBindingElement(node) {
    var isShorthand = node.kind === 226 /* ShorthandPropertyAssignment */;
    var value = isShorthand
        ? convertDeclarationName(node.name)
        : convertExpression(node.initializer);
    if (node.initializer) {
        value = {
            type: 'AssignmentPattern',
            left: value,
            right: convertExpression(node.initializer)
        };
    }
    return wrap(node, {
        type: 'Property',
        key: convertDeclarationName(node.name),
        value: value,
        kind: 'init',
        method: false,
        shorthand: isShorthand,
        computed: node.name.kind === 128 /* ComputedPropertyName */
    });
}
function convertObjectLiteralFunctionLikeElement(node) {
    return wrap(node, {
        type: 'Property',
        key: convertDeclarationName(node.name),
        value: convertFunctionLikeDeclaration(node),
        kind: node.kind === 137 /* GetAccessor */ ? 'get' : node.kind === 138 /* SetAccessor */ ? 'set' : 'init',
        method: node.kind === 135 /* MethodDeclaration */,
        shorthand: false,
        computed: node.name.kind === 128 /* ComputedPropertyName */
    });
}
function convertUnaryOperator(op) {
    switch (op) {
        case 34 /* MinusToken */:
            return "-";
        case 33 /* PlusToken */:
            return "+";
        case 46 /* ExclamationToken */:
            return "!";
        case 47 /* TildeToken */:
            return "~";
        default:
            throw new TypeError("Unknown unary operator: " + SyntaxName[op]);
    }
}
function tryConvertUpdateOperator(op) {
    switch (op) {
        case 38 /* PlusPlusToken */:
            return "++";
        case 39 /* MinusMinusToken */:
            return "--";
    }
}
//# sourceMappingURL=index.js.map