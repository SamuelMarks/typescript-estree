/// <reference path="typings/node/node.d.ts" />
/// <reference path="node_modules/typescript/bin/typescript.d.ts" />
/// <reference path="typings/estree/estree.d.ts" />

declare function installBetterLog(options: {}): void;
declare function checkAndConvert(input: string, options?: ts.CompilerOptions): ESTree.Program;
declare function acornParse(src: string, options: {}): ESTree.Program;
declare function tsParse(src: string, options: ts.CompilerOptions): ESTree.Program;

import { install as installBetterLog } from 'better-log';
import 'source-map-support/register';
import { parse as acornParse } from 'acorn';
import { checkAndConvert as tsParse } from './';
import { readFileSync as readFile } from 'fs';
import * as ts from 'typescript';

installBetterLog({ depth: 3 });

interface PathItem {
	key: string;
	src: any;
	gen: any;
	code?: string;
}

function diffAST(path: Array<PathItem>) {
	var last = path[path.length - 1];
	var src = last.src;
	var gen = last.gen;
	if (typeof src !== 'object' || src === null || typeof gen !== 'object' || gen === null) {
		if (src !== gen) {
			var owner = path.length >= 2 ? path[path.length - 2] : last;
			console.warn({
				path: path.map(function (item) {
					return item.key;
				}).join('.'),
				src: owner.src,
				gen: owner.gen
			});
		}
		return;
	}
	if (src.range && gen.range && (src.range[0] !== gen.range[0] || src.range[1] !== gen.range[1])) {
		console.warn({
			path: path.map(function (item) {
				return item.key;
			}).join('.'),
			srcCovers: path[0].code.slice(src.range[0], src.range[1]),
			genCovers: path[0].code.slice(gen.range[0], gen.range[1])
		});
	}
	for (var key in src) {
		var newSrc = <ESTree.Node>(<any>src)[key];
		var newGen = <ESTree.Node>(<any>gen)[key];
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
	console.log(name + '...');
	var sourceCode = readFile(__dirname + '/fixtures/' + name + '.js', 'utf-8');
	var sourceAst = acornParse(sourceCode, {
		ecmaVersion: version,
		locations: true,
		ranges: true,
		sourceType: sourceType,
		sourceFile: 'module.ts'
	});
	var generatedAst = tsParse(sourceCode, {
		target: version === 5 ? ts.ScriptTarget.ES5 : ts.ScriptTarget.ES6
	});
	diffAST([{
		key: 'Program',
		src: sourceAst,
		gen: generatedAst,
		code: sourceCode
	}]);
}

test('es5', 5);
//test('es2015-script', 6, 'script');
//test('es2015-module', 6, 'module');
