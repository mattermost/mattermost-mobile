// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Node, type NodeType} from 'commonmark';
import urlParse from 'url-parse';

import {DeepLink} from '@constants';
import {parseDeepLink} from '@utils/deep_link';
import {escapeRegex} from '@utils/markdown';
import {safeDecodeURIComponent} from '@utils/url';

import type {HighlightWithoutNotificationKey, SearchPattern, UserMentionKey} from '@typings/global/markdown';
import type {DeepLinkChannel, DeepLinkPermalink} from '@typings/launch';

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

export function highlightWithoutNotification(ast: Node, highlightKeys: HighlightWithoutNotificationKey[]) {
    const walker = ast.walker();

    const patterns = highlightKeysToPatterns(highlightKeys);

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node = e.node;
        if (node.type === 'text' && node.literal) {
            const {index, length} = getFirstMatch(node.literal, patterns);

            // If the text node doesn't match any of the patterns, skip the loop
            if (index === -1) {
                continue;
            }

            const matchNode = highlightTextNode(node, index, index + length, 'highlight_without_notification');

            // Resume processing on the next node after the match node which may include any remaining text
            // that was part of this one
            walker.resumeAt(matchNode, false);
        }
    }
    return ast;
}

export function highlightKeysToPatterns(highlightKeys: HighlightWithoutNotificationKey[]) {
    if (highlightKeys.length === 0) {
        return [];
    }

    return highlightKeys.
        filter((highlight) => highlight.key.trim() !== '').
        sort((a, b) => b.key.length - a.key.length).
        map(({key}) => {
            if (cjkPattern.test(key)) {
                // If the key contains Chinese, Japanese, Korean or Russian characters, don't mark word boundaries
                return new RegExp(`${escapeRegex(key)}`, 'gi');
            }

            // If the key contains only English characters, mark word boundaries
            return new RegExp(`(^|\\b)(${escapeRegex(key)})(?=_*\\b)`, 'gi');
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
        if ((node.type === 'text' || node.type === 'code') && node.literal) {
            for (const patternPattern of searchPatterns) {
                const {index, length} = getFirstMatch(node.literal, [patternPattern.pattern]);

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
    }

    return ast;
}

// Given a string and an array of regexes, returns the index and length of the first match.
export function getFirstMatch(str: string, patterns: RegExp[]) {
    let firstMatchIndex = -1;
    let firstMatchLength = -1;

    for (const pattern of patterns) {
        let matchResult;
        if (pattern.global || pattern.sticky) {
            // Since regex objects are stateful in global or sticky flags, we need to reset
            const regex = new RegExp(pattern.source, pattern.flags);
            matchResult = regex.exec(str);
        } else {
            matchResult = pattern.exec(str);
        }

        if (!matchResult || matchResult[0] === '') {
            continue;
        }

        if (firstMatchIndex === -1 || matchResult.index < firstMatchIndex) {
            firstMatchIndex = matchResult.index;
            firstMatchLength = matchResult[0].length;
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

/**
 * Parse a citation URL to extract entity type and identifier.
 * Citation URLs must have view=citation as a query parameter.
 * Uses parseDeepLink for URL structural parsing.
 *
 * URL patterns:
 * - Post: /team/pl/postId?view=citation
 * - Channel: /team/channels/channelName?view=citation
 *
 * @param url - The URL to parse
 * @param serverUrl - Optional server URL to validate this is an internal link
 * @returns Parsed citation info or null if not a valid citation URL
 */
export function parseCitationUrl(url: string, serverUrl?: string): {entityType: string; entityId: string; linkUrl: string} | null {
    const decodedUrl = safeDecodeURIComponent(url);
    const parsedUrl = urlParse(decodedUrl, true);

    // Check if view=citation is a proper query parameter
    if (parsedUrl.query.view !== 'citation') {
        return null;
    }

    // If serverUrl is provided, validate this is an internal link
    if (serverUrl) {
        const parsedServerUrl = urlParse(serverUrl);
        const normalizedServerHost = parsedServerUrl.hostname.toLowerCase();
        const normalizedUrlHost = parsedUrl.hostname.toLowerCase();

        if (normalizedUrlHost !== normalizedServerHost) {
            return null;
        }

        if (parsedServerUrl.port && parsedUrl.port !== parsedServerUrl.port) {
            return null;
        }
    }

    // Use parseDeepLink to determine the entity type from the URL structure
    const deepLink = parseDeepLink(decodedUrl);

    switch (deepLink.type) {
        case DeepLink.Permalink: {
            const data = deepLink.data as DeepLinkPermalink;
            return {
                entityType: 'POST',
                entityId: data.postId,
                linkUrl: url,
            };
        }
        case DeepLink.Channel: {
            const data = deepLink.data as DeepLinkChannel;
            return {
                entityType: 'CHANNEL',
                entityId: data.channelName,
                linkUrl: url,
            };
        }
        default:
            return null;
    }
}

/**
 * Process markdown links with ?view=citation query parameter and
 * replace them with inline_entity_link nodes that will be rendered as clickable link icons.
 *
 * This handles the new citation format:
 * - [text](http://server/team/pl/postId?view=citation) -> post citation
 * - [text](http://server/team/channels/channelName?view=citation) -> channel citation
 * - [text](http://server/team?view=citation) -> team citation
 *
 * @param ast - The AST to process
 * @param serverUrl - Optional server URL to validate internal links only
 */
export function processInlineEntities(ast: Node, serverUrl?: string) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (!e.entering) {
            continue;
        }

        const node: any = e.node;

        // Look for link nodes with citation query parameter
        if (node.type !== 'link' || !node.destination) {
            continue;
        }

        const parsed = parseCitationUrl(node.destination, serverUrl);
        if (!parsed) {
            continue;
        }

        // Create the inline entity link node
        const entityNode: any = new Node('inline_entity_link' as any);
        entityNode.entityType = parsed.entityType;
        entityNode.entityId = parsed.entityId;
        entityNode.linkUrl = parsed.linkUrl;

        // Replace the link node with the entity node
        node.insertBefore(entityNode);
        node.unlink();

        // Resume at the entity node
        walker.resumeAt(entityNode, false);
    }

    return ast;
}
