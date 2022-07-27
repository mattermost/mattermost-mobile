// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Node, NodeType} from 'commonmark';

import {escapeRegex} from '@utils/markdown';

import type {SearchPattern, UserMentionKey} from '@typings/global/markdown';

/* eslint-disable no-underscore-dangle */

const cjkPattern = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]/;

// Combines adjacent text nodes into a single text node to make further transformation easier
export function combineTextNodes(ast: any) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;

        if (node.type !== 'text') {
            continue;
        }

        while (node._next && node._next.type === 'text') {
            const next = node._next;

            node.literal += next.literal;

            node._next = next._next;
            if (node._next) {
                node._next._prev = node;
            }

            if (node._parent._lastChild === next) {
                node._parent._lastChild = node;
            }
        }

        // Resume parsing after the current node since otherwise the walker would continue to parse any old text nodes
        // that have been merged into this one
        walker.resumeAt(node, false);
    }

    return ast;
}

// Add indices to the items of every list
export function addListItemIndices(ast: any) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (e.entering) {
            const node = e.node;

            if (node.type === 'list') {
                let i = node.listStart == null ? 1 : node.listStart; // List indices match what would be displayed in the UI

                for (let child = node.firstChild; child; child = child.next) {
                    child.index = i;

                    i += 1;
                }
            }
        }
    }

    return ast;
}

// Take all images that aren't inside of tables and move them to be children of the root document node.
// When this happens, their parent nodes are split into two, if necessary, with the version that follows
// the image having its "continue" field set to true to indicate that things like bullet points don't
// need to be rendered.
export function pullOutImages(ast: any) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;

        // Skip tables because we'll render images inside of those as links
        if (node.type === 'table') {
            walker.resumeAt(node, false);
            continue;
        }

        if (node.type === 'image' && node.parent?.type !== 'document') {
            pullOutImage(node);
        }
    }

    return ast;
}

function pullOutImage(image: any) {
    const parent = image.parent;

    if (parent?.type === 'link') {
        image.linkDestination = parent.destination;
    }
}

export function highlightMentions(ast: Node, mentionKeys: UserMentionKey[]) {
    const walker = ast.walker();

    const patterns = mentionKeysToPatterns(mentionKeys);

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;

        if (node.type === 'text' && node.literal) {
            const {index, length} = getFirstMatch(node.literal, patterns);

            if (index === -1) {
                continue;
            }

            const mentionNode = highlightTextNode(node, index, index + length, 'mention_highlight');

            // Resume processing on the next node after the mention node which may include any remaining text
            // that was part of this one
            walker.resumeAt(mentionNode, false);
        } else if (node.type === 'at_mention') {
            const matches = mentionKeys.some((mention) => {
                const mentionName = '@' + node.mentionName;
                const flags = mention.caseSensitive ? '' : 'i';
                const pattern = new RegExp(`@${escapeRegex(mention.key.replace('@', ''))}\\.?\\b`, flags);

                return pattern.test(mentionName);
            });

            if (!matches) {
                continue;
            }

            const wrapper = new Node('mention_highlight');
            wrapNode(wrapper, node);

            // Skip processing the wrapper to prevent checking this node again as its child
            walker.resumeAt(wrapper, false);
        }
    }

    return ast;
}

const puncStart = /^[^\p{L}\d\s#]+/u;
const puncEnd = /[^\p{L}\d\s]+$/u;

export function parseSearchTerms(searchTerm: string): string[] {
    let terms = [];

    let termString = searchTerm;

    while (termString) {
        let captured;

        // check for a quoted string
        captured = (/^"([^"]*)"/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);

            if (captured[1].length > 0) {
                terms.push(captured[1]);
            }
            continue;
        }

        // check for a search flag (and don't add it to terms)
        captured = (/^-?(?:in|from|channel|on|before|after): ?\S+/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);
            continue;
        }

        // capture at mentions differently from the server so we can highlight them with the preceeding at sign
        captured = (/^@[a-z0-9.-_]+\b/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);

            terms.push(captured[0]);
            continue;
        }

        // capture any plain text up until the next quote or search flag
        captured = (/^.+?(?=(?:\b|\B-)(?:in:|from:|channel:|on:|before:|after:)|"|$)/).exec(termString);
        if (captured) {
            termString = termString.substring(captured[0].length);

            // break the text up into words based on how the server splits them in SqlPostStore.SearchPosts and then discard empty terms
            terms.push(
                ...captured[0].split(/[ <>+()~@]/).filter((term) => Boolean(term)),
            );
            continue;
        }

        // we should never reach this point since at least one of the regexes should match something in the remaining text
        throw new Error(
            'Infinite loop in search term parsing: "' + termString + '"',
        );
    }

    // remove punctuation from each term
    terms = terms.map((term) => {
        term.replace(puncStart, '');
        if (term.charAt(term.length - 1) !== '*') {
            term.replace(puncEnd, '');
        }
        return term;
    });

    return terms;
}

function convertSearchTermToRegex(term: string): SearchPattern {
    let pattern;

    if (cjkPattern.test(term)) {
        // term contains Chinese, Japanese, or Korean characters so don't mark word boundaries
        pattern = '()(' + escapeRegex(term.replace(/\*/g, '')) + ')';
    } else if ((/[^\s][*]$/).test(term)) {
        pattern = '\\b()(' + escapeRegex(term.substring(0, term.length - 1)) + ')';
    } else if (term.startsWith('@') || term.startsWith('#')) {
        // needs special handling of the first boundary because a word boundary doesn't work before a symbol
        pattern = '(\\W|^)(' + escapeRegex(term) + ')\\b';
    } else {
        pattern = '\\b()(' + escapeRegex(term) + ')\\b';
    }

    return {
        pattern: new RegExp(pattern, 'gi'),
        term,
    };
}

export function searchTermsToPatterns(terms: string) {
    const hasPhrases = (/"([^"]*)"/).test(terms || '');

    const searchPatterns = parseSearchTerms(terms || '').map(convertSearchTermToRegex).sort((a, b) => {
        return b.term.length - a.term.length;
    });

    return searchPatterns;
}

export function mentionKeysToPatterns(mentionKeys: UserMentionKey[]) {
    return mentionKeys.filter((mention) => mention.key.trim() !== '').map((mention) => {
        const flags = mention.caseSensitive ? '' : 'i';
        let pattern;
        if (cjkPattern.test(mention.key)) {
            pattern = new RegExp(`${escapeRegex(mention.key)}`, flags);
        } else {
            pattern = new RegExp(`\\b${escapeRegex(mention.key)}(?=_*\\b)`, flags);
        }

        return pattern;
    });
}

export function highlightSearchPatterns(ast: Node, searchPatterns: SearchPattern[]) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;

        if (node.type === 'text' && node.literal) {
            const {index, length} = getFirstMatch(node.literal, searchPatterns.map((pattern) => pattern.pattern));

            // TODO we might need special handling here for if the search term is part of a hashtag

            if (index === -1) {
                continue;
            }

            const matchNode = highlightTextNode(node, index, index + length, 'search_highlight');

            // Resume processing on the next node after the match node which may include any remaining text
            // that was part of this one
            walker.resumeAt(matchNode, false);
        }
    }

    return ast;
}

// Given a string and an array of regexes, returns the index and length of the first match.
export function getFirstMatch(str: string, patterns: RegExp[]) {
    let firstMatchIndex = -1;
    let firstMatchLength = -1;

    for (const pattern of patterns) {
        const match = pattern.exec(str);
        if (!match || match[0] === '') {
            continue;
        }

        if (firstMatchIndex === -1 || match.index < firstMatchIndex) {
            firstMatchIndex = match.index;
            firstMatchLength = match[0].length;
        }
    }

    return {
        index: firstMatchIndex,
        length: firstMatchLength,
    };
}

// Given a text node, start/end indices, and a highlight node type, splits it into up to three nodes:
// the text before the highlight (if any exists), the highlighted text, and the text after the highlight
// the end of the highlight (if any exists). Returns a node containing the highlighted text.
export function highlightTextNode(node: Node, start: number, end: number, type: NodeType) {
    const literal = node.literal;
    node.literal = literal!.substring(start, end);

    // Start by wrapping the node and then re-insert any non-highlighted code around it
    const highlighted = new Node(type);
    wrapNode(highlighted, node);

    if (start !== 0) {
        const before = new Node('text');
        before.literal = literal!.substring(0, start);

        highlighted.insertBefore(before);
    }

    if (end !== literal!.length) {
        const after = new Node('text');
        after.literal = literal!.substring(end);

        highlighted.insertAfter(after);
    }

    return highlighted;
}

// Wraps a given node in another node of the given type. The wrapper will take the place of
// the node in the AST relative to its parents and siblings, and it will have the node as
// its only child.
function wrapNode(wrapper: any, node: any) {
    // Set parent and update parent's children if necessary
    wrapper._parent = node._parent;
    if (node._parent._firstChild === node) {
        node._parent._firstChild = wrapper;
    }
    if (node._parent._lastChild === node) {
        node._parent._lastChild = wrapper;
    }

    // Set siblings and update those if necessary
    wrapper._prev = node._prev;
    node._prev = null;
    if (wrapper._prev) {
        wrapper._prev._next = wrapper;
    }

    wrapper._next = node._next;
    node._next = null;
    if (wrapper._next) {
        wrapper._next._prev = wrapper;
    }

    // Make node a child of wrapper
    wrapper._firstChild = node;
    wrapper._lastChild = node;
    node._parent = wrapper;
}

export function parseTaskLists(ast: Node) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;

        if (node.type !== 'item') {
            continue;
        }

        if (node.firstChild?.type === 'paragraph' && node.firstChild?.firstChild?.type === 'text') {
            const paragraphNode = node.firstChild;
            const textNode = node.firstChild.firstChild;

            const literal = textNode.literal ?? '';

            const match = (/^ {0,3}\[( |x)\]\s/).exec(literal);
            if (match) {
                const checkbox = new Node('checkbox');
                checkbox.isChecked = match[1] === 'x';

                paragraphNode.prependChild(checkbox);

                textNode.literal = literal.substring(match[0].length);
            }
        }
    }

    return ast;
}
