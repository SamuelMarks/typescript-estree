/// <reference path='./typings/node/node.d.ts' />
/// <reference path='./typings/estree/estree.d.ts' />
/// <reference path='./typings/acorn/acorn.d.ts' />
/// <reference path='./node_modules/typescript/lib/typescript.d.ts' />
/// <reference path='./cust_typings/better-log/better-log.d.ts' />
/// <reference path='./typescript-estree.d.ts' />

import { install as installBetterLog } from 'better-log';
import 'source-map-support/register';
import { parse as acornParse } from 'acorn';
import { checkAndConvert as tsParse } from './';
import { readFileSync as readFile } from 'fs';
import * as ts from 'typescript';

installBetterLog({ depth: 3 });

interface PathItem {
    key: string;
    gen: any;
    code?: ESTree.Program | string;
}

interface NodePathItem extends PathItem {
    key: string;
    src: ESTree.Node;
    gen: ESTree.Node;
}

interface ProgramPathItem extends NodePathItem {
    code: string;
}

function diffAST(path: Array<NodePathItem>) {
    const last = path[path.length - 1];
    const src = last.src;
    const gen = last.gen;
    if (typeof src !== 'object' || src === null || typeof gen !== 'object' || gen === null) {
        if (src != gen) {
            let owner = <NodePathItem>last;
            if (path.length >= 2) {
                owner = path[path.length - 2];
                if (owner.src.type === 'Program' && last.key === 'sourceType') {
                    // KNOWN
                    return;
                }
                if (owner.src.type === 'MethodDefinition' && last.key === 'kind') {
                    // KNOWN
                    return;
                }
                if (path.length >= 3 && path[path.length - 3].src.type) {
                    owner = path[path.length - 3];
                }
            }
            console.warn({
                path: path.map(function(item) {
                    return item.key;
                }).join('.'),
                srcCode: (<ProgramPathItem>path[0]).code.slice(owner.src.range[0], owner.src.range[1]),
                genCode: (<ProgramPathItem>path[0]).code.slice(owner.gen.range[0], owner.gen.range[1]),
                srcValue: src,
                genValue: gen
            });
        }
        return;
    }
	/*
	if (src.range && gen.range && (src.range[0] !== gen.range[0] || src.range[1] !== gen.range[1])) {
		console.warn({
			path: path.map(function (item) {
				return item.key;
			}).join('.'),
			srcCovers: path[0].code.slice(src.range[0], src.range[1]),
			genCovers: path[0].code.slice(gen.range[0], gen.range[1])
		});
	}
	*/
    for (let key in src) {
        const newSrc = <ESTree.Node>(<any>src)[key];
        const newGen = <ESTree.Node>(<any>gen)[key];
        if (key !== 'loc' && key !== 'range' && newGen !== undefined) {
            diffAST(path.concat([{
                key: key,
                src: newSrc,
                gen: newGen
            }]));
        }
    }
}

function test(name: string, version: number, sourceType?: string) {
    console.log(`${name}...`);
    const sourceCode = readFile(`${__dirname}/fixtures/${name}.js`, 'utf-8');
    const sourceAst = acornParse(sourceCode, {
        ecmaVersion: version,
        locations: true,
        ranges: true,
        sourceType: sourceType,
        sourceFile: 'module.ts'
    });
    const generatedAst = tsParse(sourceCode, {
        target: version === 5 ? ts.ScriptTarget.ES5 : ts.ScriptTarget.ES6
    });
    diffAST([{
        key: 'Program',
        src: sourceAst,
        gen: generatedAst,
        code: sourceCode
    }]);
    console.log(`Done ${name}`);
}

test('es5', 5);
test('es2015-script', 6, 'script');
test('es2015-module', 6, 'module');
