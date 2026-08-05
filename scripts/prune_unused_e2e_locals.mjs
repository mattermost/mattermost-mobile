#!/usr/bin/env node
/**
 * Safely remove unused imports/locals from detox e2e specs using eslint JSON.
 * Line-oriented removals to avoid gluing statements together.
 *
 * Usage: node scripts/prune_unused_e2e_locals.mjs <eslint.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const eslintPath = process.argv[2];
if (!eslintPath) {
    console.error('Usage: node scripts/prune_unused_e2e_locals.mjs <eslint.json>');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(eslintPath, 'utf8'));

function lineRange(text, pos) {
    const start = text.lastIndexOf('\n', pos - 1) + 1;
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    else end += 1; // include newline
    return [start, end];
}

function collapseBlankLines(text) {
    return text.replace(/\n{3,}/g, '\n\n');
}

function applyLineDeletes(text, positions) {
    const ranges = positions.map((p) => lineRange(text, p));
    // merge overlapping/adjacent line ranges
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of ranges) {
        if (!merged.length || r[0] > merged[merged.length - 1][1]) merged.push(r);
        else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    }
    let out = '';
    let cursor = 0;
    for (const [s, e] of merged) {
        out += text.slice(cursor, s);
        cursor = e;
    }
    out += text.slice(cursor);
    return out;
}

function pruneFile(filePath, unusedNames) {
    const unused = new Set(unusedNames);
    let text = fs.readFileSync(filePath, 'utf8');
    const original = text;
    const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const deletePositions = [];
    const importRewrites = []; // {start,end,rep}
    const bindingRewrites = [];

    const visit = (node) => {
        // Default import: import fs from 'fs'
        if (ts.isImportDeclaration(node) && node.importClause) {
            const clause = node.importClause;
            const defaultName = clause.name?.text;
            const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings)
                ? clause.namedBindings.elements
                : [];
            const ns = clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)
                ? clause.namedBindings.name.text
                : null;

            if (ns && unused.has(ns) && !defaultName && named.length === 0) {
                deletePositions.push(node.getStart(sf));
            } else if (named.length || defaultName) {
                const keepDefault = defaultName && !unused.has(defaultName) ? defaultName : null;
                const keepNamed = named.filter((el) => !unused.has(el.name.text));
                const dropAll = !keepDefault && keepNamed.length === 0 && !ns;
                if (dropAll) {
                    deletePositions.push(node.getStart(sf));
                } else if (
                    (defaultName && unused.has(defaultName)) ||
                    keepNamed.length < named.length
                ) {
                    // rebuild import line(s)
                    const mod = node.moduleSpecifier.getText(sf);
                    let rep;
                    if (keepDefault && keepNamed.length) {
                        const orig = text.slice(clause.namedBindings.getStart(sf), clause.namedBindings.getEnd());
                        if (orig.includes('\n')) {
                            const ind = (orig.match(/\n(\s+)\S/) || [, '    '])[1];
                            rep = `import ${keepDefault}, {\n${keepNamed.map((el) => `${ind}${el.getText(sf)},`).join('\n')}\n} from ${mod};`;
                        } else {
                            rep = `import ${keepDefault}, {${keepNamed.map((el) => el.getText(sf)).join(', ')}} from ${mod};`;
                        }
                    } else if (keepDefault) {
                        rep = `import ${keepDefault} from ${mod};`;
                    } else if (keepNamed.length) {
                        const orig = text.slice(clause.namedBindings.getStart(sf), clause.namedBindings.getEnd());
                        if (orig.includes('\n')) {
                            const ind = (orig.match(/\n(\s+)\S/) || [, '    '])[1];
                            rep = `import {\n${keepNamed.map((el) => `${ind}${el.getText(sf)},`).join('\n')}\n} from ${mod};`;
                        } else {
                            rep = `import {${keepNamed.map((el) => el.getText(sf)).join(', ')}} from ${mod};`;
                        }
                    }
                    if (rep) {
                        // replace whole import declaration lines
                        const [ls, le] = lineRange(text, node.getStart(sf));
                        // if multiline import, span to end line of node
                        const endLine = lineRange(text, node.getEnd() - 1)[1];
                        importRewrites.push({start: ls, end: endLine, rep: rep + '\n'});
                    }
                }
            }
        }

        // const/let/var name = ...  OR helper const name = async () => {}
        if (ts.isVariableStatement(node)) {
            const decls = node.declarationList.declarations;
            if (decls.length === 1 && ts.isIdentifier(decls[0].name) && unused.has(decls[0].name.text)) {
                deletePositions.push(node.getStart(sf));
                // if multiline (arrow fn), delete all lines of the statement
                const start = node.getStart(sf);
                const end = node.getEnd();
                let p = start;
                while (p < end) {
                    deletePositions.push(p);
                    const nl = text.indexOf('\n', p);
                    if (nl < 0 || nl >= end) break;
                    p = nl + 1;
                }
            }

            // Object binding: const {a, b} = ...
            if (decls.length === 1 && ts.isObjectBindingPattern(decls[0].name)) {
                const elems = decls[0].name.elements.filter(ts.isBindingElement);
                const keep = elems.filter((el) => ts.isIdentifier(el.name) ? !unused.has(el.name.text) : true);
                if (keep.length !== elems.length) {
                    if (keep.length === 0) {
                        // Keep side-effect initializer as its own statement
                        if (decls[0].initializer) {
                            const init = decls[0].initializer.getText(sf);
                            const [ls, le] = lineRange(text, node.getStart(sf));
                            const endLine = lineRange(text, node.getEnd() - 1)[1];
                            const indent = text.slice(ls, node.getStart(sf));
                            bindingRewrites.push({start: ls, end: endLine, rep: `${indent}${init};\n`});
                        } else {
                            deletePositions.push(node.getStart(sf));
                        }
                    } else {
                        const start = decls[0].name.getStart(sf);
                        const end = decls[0].name.getEnd();
                        const inner = keep.map((el) => el.getText(sf)).join(', ');
                        bindingRewrites.push({start, end, rep: `{${inner}}`});
                    }
                }
            }
        }

        if (ts.isFunctionDeclaration(node) && node.name && unused.has(node.name.text)) {
            const start = node.getStart(sf);
            const end = node.getEnd();
            let p = start;
            while (p < end) {
                deletePositions.push(p);
                const nl = text.indexOf('\n', p);
                if (nl < 0 || nl >= end) break;
                p = nl + 1;
            }
        }

        // Assignments: testChannel = channel;
        if (
            ts.isExpressionStatement(node) &&
            ts.isBinaryExpression(node.expression) &&
            node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(node.expression.left) &&
            unused.has(node.expression.left.text)
        ) {
            deletePositions.push(node.getStart(sf));
        }

        ts.forEachChild(node, visit);
    };
    visit(sf);

    // Apply binding/import rewrites first (non-overlapping, descending)
    const rewrites = [...importRewrites, ...bindingRewrites].sort((a, b) => b.start - a.start);
    for (const r of rewrites) {
        text = text.slice(0, r.start) + r.rep + text.slice(r.end);
    }

    // Recompute deletes on updated text? Safer to re-parse if rewrites happened.
    if (rewrites.length) {
        // second pass deletes only on fresh parse
        const sf2 = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const del2 = [];
        const visit2 = (node) => {
            if (ts.isImportDeclaration(node) && node.importClause) {
                const clause = node.importClause;
                const defaultName = clause.name?.text;
                const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings)
                    ? clause.namedBindings.elements
                    : [];
                if (!defaultName && named.length === 0 && !clause.namedBindings) {
                    del2.push(node.getStart(sf2));
                } else if (
                    named.length &&
                    named.every((el) => unused.has(el.name.text)) &&
                    (!defaultName || unused.has(defaultName))
                ) {
                    del2.push(node.getStart(sf2));
                }
            }
            if (ts.isVariableStatement(node)) {
                const decls = node.declarationList.declarations;
                if (decls.length === 1 && ts.isIdentifier(decls[0].name) && unused.has(decls[0].name.text)) {
                    const start = node.getStart(sf2);
                    const end = node.getEnd();
                    let p = start;
                    while (p < end) {
                        del2.push(p);
                        const nl = text.indexOf('\n', p);
                        if (nl < 0 || nl >= end) break;
                        p = nl + 1;
                    }
                }
            }
            if (ts.isFunctionDeclaration(node) && node.name && unused.has(node.name.text)) {
                const start = node.getStart(sf2);
                const end = node.getEnd();
                let p = start;
                while (p < end) {
                    del2.push(p);
                    const nl = text.indexOf('\n', p);
                    if (nl < 0 || nl >= end) break;
                    p = nl + 1;
                }
            }
            if (
                ts.isExpressionStatement(node) &&
                ts.isBinaryExpression(node.expression) &&
                node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                ts.isIdentifier(node.expression.left) &&
                unused.has(node.expression.left.text)
            ) {
                del2.push(node.getStart(sf2));
            }
            ts.forEachChild(node, visit2);
        };
        visit2(sf2);
        text = applyLineDeletes(text, del2);
    } else {
        text = applyLineDeletes(text, deletePositions);
    }

    text = collapseBlankLines(text);
    if (!text.endsWith('\n') && original.endsWith('\n')) text += '\n';

    if (text !== original) {
        fs.writeFileSync(filePath, text);
        return true;
    }
    return false;
}

let changed = 0;
for (const file of report) {
    const msgs = (file.messages || []).filter((m) => m.ruleId === '@typescript-eslint/no-unused-vars');
    if (!msgs.length) continue;
    const names = [];
    for (const m of msgs) {
        const match = m.message.match(/'([^']+)'/);
        if (match) names.push(match[1]);
    }
    try {
        if (pruneFile(file.filePath, names)) {
            changed++;
            console.log('pruned', path.relative(process.cwd(), file.filePath));
        }
    } catch (e) {
        console.error('FAIL', file.filePath, e);
    }
}
console.log(`\nUpdated ${changed} files`);
