var better_log_1 = require('better-log');
require('source-map-support/register');
var acorn_1 = require('acorn');
var _1 = require('./');
var fs_1 = require('fs');
var ts = require('typescript');
better_log_1.install({ depth: 3 });
function diffAST(path) {
    var last = path[path.length - 1];
    var src = last.src;
    var gen = last.gen;
    if (typeof src !== 'object' || src === null || typeof gen !== 'object' || gen === null) {
        if (src != gen) {
            var owner = last;
            if (path.length >= 2) {
                owner = path[path.length - 2];
                if (owner.src.type === 'Program' && last.key === 'sourceType') {
                    return;
                }
                if (owner.src.type === 'MethodDefinition' && last.key === 'kind') {
                    return;
                }
                if (path.length >= 3 && path[path.length - 3].src.type) {
                    owner = path[path.length - 3];
                }
            }
            console.warn({
                path: path.map(function (item) {
                    return item.key;
                }).join('.'),
                srcCode: path[0].code.slice(owner.src.range[0], owner.src.range[1]),
                genCode: path[0].code.slice(owner.gen.range[0], owner.gen.range[1]),
                srcValue: src,
                genValue: gen
            });
        }
        return;
    }
    for (var key in src) {
        var newSrc = src[key];
        var newGen = gen[key];
        if (key !== 'loc' && key !== 'range' && newGen !== undefined) {
            diffAST(path.concat([{
                    key: key,
                    src: newSrc,
                    gen: newGen
                }]));
        }
    }
}
function test(name, version, sourceType) {
    console.log(name + "...");
    var sourceCode = fs_1.readFileSync(__dirname + "/fixtures/" + name + ".js", 'utf-8');
    var sourceAst = acorn_1.parse(sourceCode, {
        ecmaVersion: version,
        locations: true,
        ranges: true,
        sourceType: sourceType,
        sourceFile: 'module.ts'
    });
    var generatedAst = _1.checkAndConvert(sourceCode, {
        target: version === 5 ? 1 : 2
    });
    diffAST([{
            key: 'Program',
            src: sourceAst,
            gen: generatedAst,
            code: sourceCode
        }]);
    console.log("Done " + name);
}
test('es5', 5);
test('es2015-script', 6, 'script');
test('es2015-module', 6, 'module');
