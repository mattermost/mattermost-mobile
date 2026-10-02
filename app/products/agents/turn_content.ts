// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    BlockType,
    ToolApprovalStage,
    ToolCallStatus,
    ToolCallStatusString,
    type Annotation,
    type ContentBlock,
    type ConversationResponse,
    type Round,
    type ToolCall,
    type Turn,
} from '@agents/types';

export function statusStringToEnum(status: string | undefined): ToolCallStatus {
    switch (status) {
        case ToolCallStatusString.Pending:
            return ToolCallStatus.Pending;
        case ToolCallStatusString.Accepted:
            return ToolCallStatus.Accepted;
        case ToolCallStatusString.Rejected:
            return ToolCallStatus.Rejected;
        case ToolCallStatusString.Error:
            return ToolCallStatus.Error;
        case ToolCallStatusString.Success:
            return ToolCallStatus.Success;
        case ToolCallStatusString.AutoApproved:
            return ToolCallStatus.AutoApproved;
        default:
            return ToolCallStatus.Pending;
    }
}

// The anchor is the highest-sequence assistant turn matching post_id, so
// tool-round turns sit before it. Walk backwards from the anchor until a user
// turn or a foreign post's anchor.
function findAnchorIndex(sorted: Turn[], postId: string): number {
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].post_id === postId && sorted[i].role === 'assistant') {
            return i;
        }
    }
    return -1;
}

/** Sequence of the post's current response anchor turn, or -1 if it has none. */
export function getResponseAnchorSequence(conversation: ConversationResponse, postId: string): number {
    const sorted = [...conversation.turns].sort((a, b) => a.sequence - b.sequence);
    const anchorIdx = findAnchorIndex(sorted, postId);
    return anchorIdx === -1 ? -1 : sorted[anchorIdx].sequence;
}

export function collectResponseTurns(conversation: ConversationResponse, postId: string): Turn[] {
    const sorted = [...conversation.turns].sort((a, b) => a.sequence - b.sequence);
    const anchorIdx = findAnchorIndex(sorted, postId);
    if (anchorIdx === -1) {
        return [];
    }

    const out: Turn[] = [];
    for (let i = anchorIdx - 1; i >= 0; i--) {
        const t = sorted[i];
        if (t.role === 'user') {
            break;
        }

        // Any post-anchored turn bounds this response: either a foreign post's
        // anchor (sweeping on would pull in its tool_use blocks) or a
        // superseded generation of this same post — regen paths that don't
        // scrub prior response turns (e.g. thread analysis) leave one anchored
        // assistant turn per generation, and collecting them would stack every
        // prior answer above the current one. Mid-response turns never carry a
        // post_id: tool rounds are written without one and a continuation
        // demotes the prior anchor to null before the new anchor is created.
        if (t.post_id) {
            break;
        }
        out.unshift(t);
    }
    out.push(sorted[anchorIdx]);
    return out;
}

// Index every tool_result block in the conversation by tool_use_id. Results
// may land after the anchor when newly-approved tools resolve, so search every
// turn instead of only the collected response range.
function buildToolResultMap(conversation: ConversationResponse): Map<string, ContentBlock> {
    const resultMap = new Map<string, ContentBlock>();
    for (const t of conversation.turns) {
        for (const block of t.content) {
            if (block.type === BlockType.ToolResult && block.tool_use_id) {
                resultMap.set(block.tool_use_id, block);
            }
        }
    }
    return resultMap;
}

function toolUseBlockToToolCall(block: ContentBlock, resultMap: Map<string, ContentBlock>): ToolCall {
    const resultBlock = block.id ? resultMap.get(block.id) : undefined;
    return {
        id: block.id ?? '',
        name: block.name ?? '',
        title: block.title || undefined,
        description: block.description ?? '',
        arguments: block.input ?? undefined,
        result: resultBlock?.content ?? undefined,
        status: statusStringToEnum(block.status),
        server_origin: block.server_origin ?? undefined,
        mcp_bare_name: block.mcp_bare_name ?? undefined,
        user_interaction: block.user_interaction ?? undefined,
        would_auto_execute: block.would_auto_execute ?? undefined,
        decided: resultBlock?.decided_at != null,
    };
}

export function extractAnnotationsFromTurn(turn: Turn | undefined): Annotation[] {
    if (!turn) {
        return [];
    }

    const annotations: Annotation[] = [];
    let runningIndex = 0;

    for (const block of turn.content) {
        // Annotations block (web search context). The streamer persists the
        // live annotations array verbatim into web_search_context.results, so
        // surface those without re-deriving indices.
        if (block.type === BlockType.Annotations && block.web_search_context) {
            const results = block.web_search_context.results;
            if (Array.isArray(results)) {
                for (const r of results as Array<Partial<Annotation>>) {
                    if (r && r.type === 'url_citation') {
                        annotations.push({
                            type: 'url_citation',
                            start_index: r.start_index ?? 0,
                            end_index: r.end_index ?? 0,
                            url: r.url,
                            title: r.title,
                            cited_text: r.cited_text,
                            index: r.index ?? runningIndex,
                        });
                        runningIndex++;
                    }
                }
            }
        }

        if (block.type === BlockType.Text && block.citations) {
            for (const c of block.citations) {
                annotations.push({
                    type: 'url_citation',
                    start_index: c.start_index,
                    end_index: c.end_index,
                    url: c.url,
                    title: c.title,
                    index: runningIndex,
                });
                runningIndex++;
            }
        }
    }

    return annotations;
}

// Matches OpenAI-style inline citation clutter like "(source: https://…)"
// that some models emit mid-sentence, with the spaces around it when it sits
// before punctuation. Adapted from the plugin webapp's citation_processor.tsx,
// which runs on rendered text nodes; here it runs on markdown source, so the
// URL allows one level of balanced parentheses (e.g. Wikipedia links) and
// otherwise stops at the first `)`.
const openAICitationRegex = /[ \t]*\([^\s:()]+\s*:\s*https?:\/\/(?:[^\s()]|\([^\s()]*\))*\)(?:[ \t]+(?=[.,;:!?]))?/g;

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const INDENTED_CODE = /^(?: {4}|\t)/;

const CITATION_FOLLOWER = /[\s.,;:!?)]/;

function stripCitationsFromProse(text: string): string {
    return text.replace(openAICitationRegex, (match: string, offset: number) => {
        const next = text.charAt(offset + match.length);
        if (next === '' || CITATION_FOLLOWER.test(next)) {
            return '';
        }

        // Glued to the next word: keep the separating whitespace.
        return match.slice(0, match.indexOf('('));
    });
}

function backtickRunEnd(text: string, start: number): number {
    let end = start;
    while (text[end] === '`') {
        end++;
    }
    return end;
}

// Strips citations from a block of prose lines, skipping inline code spans
// (a backtick run closed by a run of the same length).
function stripCitationsOutsideInlineCode(text: string): string {
    let result = '';
    let proseStart = 0;
    let i = 0;
    while (i < text.length) {
        if (text[i] !== '`') {
            i++;
            continue;
        }
        const openEnd = backtickRunEnd(text, i);
        const runLength = openEnd - i;
        let closeEnd = -1;
        let k = openEnd;
        while (k < text.length) {
            if (text[k] === '`') {
                const runEnd = backtickRunEnd(text, k);
                if (runEnd - k === runLength) {
                    closeEnd = runEnd;
                    break;
                }
                k = runEnd;
            } else {
                k++;
            }
        }
        if (closeEnd === -1) {
            i = openEnd;
            continue;
        }
        result += stripCitationsFromProse(text.slice(proseStart, i)) + text.slice(i, closeEnd);
        proseStart = closeEnd;
        i = closeEnd;
    }
    return result + stripCitationsFromProse(text.slice(proseStart));
}

// Strip inline "(source: https://…)" noise from agent-generated text before
// rendering, leaving fenced, indented and inline code untouched.
export function stripOpenAICitations(text: string): string {
    const out: string[] = [];
    let prose: string[] = [];
    const flushProse = () => {
        if (prose.length) {
            out.push(stripCitationsOutsideInlineCode(prose.join('\n')));
            prose = [];
        }
    };

    let fence: {char: string; length: number} | undefined;
    let prevBlankOrCode = true;
    for (const line of text.split('\n')) {
        if (fence) {
            out.push(line);
            const close = FENCE_CLOSE.exec(line);
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
                fence = undefined;
            }
            continue;
        }

        const open = FENCE_OPEN.exec(line);
        if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
            flushProse();
            out.push(line);
            fence = {char: open[1][0], length: open[1].length};
            prevBlankOrCode = true;
            continue;
        }

        // Indented code can't interrupt a paragraph.
        if (prevBlankOrCode && INDENTED_CODE.test(line) && line.trim() !== '') {
            flushProse();
            out.push(line);
            continue;
        }

        prose.push(line);
        prevBlankOrCode = line.trim() === '';
    }
    flushProse();
    return out.join('\n');
}

function emptyRound(id: string): Round {
    return {id, text: '', toolCalls: [], reasoning: {summary: '', signature: ''}, annotations: [], serverTools: []};
}

// Split one assistant turn into rounds rendered reasoning -> activity -> text:
// a block whose slot is already filled starts a new round, so provider
// activity that follows text renders below it (webapp splitTurnIntoRounds).
// Client tool_use blocks and the turn's annotations stay on the last round —
// toolrunner persists each client tool round as its own turn, and citations
// render as one combined list per post.
function splitTurnIntoRounds(turn: Turn, resultMap: Map<string, ContentBlock>): Round[] {
    const rounds = [emptyRound(turn.id)];
    const current = () => rounds[rounds.length - 1];
    const startRound = () => rounds.push(emptyRound(`${turn.id}-${rounds.length}`));

    for (const block of turn.content) {
        if (block.type === BlockType.Thinking && block.text) {
            if (current().text !== '' || current().serverTools.length > 0) {
                startRound();
            }
            const {reasoning} = current();
            reasoning.summary = reasoning.summary === '' ? block.text : `${reasoning.summary}\n${block.text}`;
            reasoning.signature = block.signature ?? reasoning.signature;
        } else if (block.type === BlockType.ServerToolUse && block.server_tool) {
            if (current().text !== '') {
                startRound();
            }
            current().serverTools.push(block.server_tool);
        } else if (block.type === BlockType.Text) {
            current().text += block.text ?? '';
        }
    }

    const last = current();
    last.toolCalls = turn.content.
        filter((b) => b.type === BlockType.ToolUse).
        map((block) => toolUseBlockToToolCall(block, resultMap));
    last.annotations = extractAnnotationsFromTurn(turn);
    return rounds;
}

// Build the ordered rounds for a post's response: one or more Rounds per
// assistant turn, in sequence order, so multi-step tool answers render in
// their true order instead of being flattened into a single block.
//
// BlockType.File / BlockType.Image blocks are intentionally not rendered,
// mirroring the plugin webapp (turn_content_utils.ts only reads Text, Thinking,
// ToolUse, ToolResult, ServerToolUse and Annotations blocks): generated files
// are merged into post.FileIds by the plugin, so they render through the
// standard post file attachments chrome (Files inside the post Body), not from
// conversation turns.
export function buildRoundsFromTurns(conversation: ConversationResponse, postId: string): Round[] {
    const turns = collectResponseTurns(conversation, postId);
    if (turns.length === 0) {
        return [];
    }

    const resultMap = buildToolResultMap(conversation);
    return turns.
        filter((turn) => turn.role === 'assistant').
        flatMap((turn) => splitTurnIntoRounds(turn, resultMap));
}

// Defaults to Done when the anchor or approval_state is missing so the UI
// fails closed (no buttons) rather than rendering approval controls in error.
export function deriveApprovalStageForPost(conversation: ConversationResponse, postId: string): ToolApprovalStage {
    let anchor: Turn | undefined;
    for (const turn of conversation.turns) {
        if (turn.post_id === postId && turn.role === 'assistant' && (!anchor || turn.sequence > anchor.sequence)) {
            anchor = turn;
        }
    }
    return anchor?.approval_state ?? ToolApprovalStage.Done;
}

export function anyToolHasArguments(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.arguments != null);
}

export function anyToolHasResult(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.result != null);
}
