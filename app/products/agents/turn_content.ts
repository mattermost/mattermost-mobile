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
    type ToolCall,
    type Turn,
} from '@agents/types';

/** Map conversation-API status strings to the numeric enum used by the tool UI. */
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

/**
 * Collect every turn that belongs to the same assistant response as the post
 * identified by `postId`. The anchor is the turn whose post_id matches; the
 * streaming layer writes it at finalize with the highest sequence in the
 * response, so tool-round turns persisted during the stream sit BEFORE it.
 * We walk backwards from the anchor, stopping at the user turn that started
 * this response (or at a turn that belongs to a different post's response),
 * and include the anchor itself.
 */
function collectResponseTurns(conversation: ConversationResponse, postId: string): Turn[] {
    const sorted = [...conversation.turns].sort((a, b) => a.sequence - b.sequence);
    const anchorIdx = sorted.findIndex((t) => t.post_id === postId);
    if (anchorIdx === -1) {
        return [];
    }

    const out: Turn[] = [];
    for (let i = anchorIdx - 1; i >= 0; i--) {
        const t = sorted[i];
        if (t.role === 'user') {
            break;
        }

        // Stop when we cross into another post's response — its anchor turn
        // has a post_id of its own. Without this, an approval-continuation
        // post would sweep in the preceding post's tool_use blocks.
        if (t.post_id && t.post_id !== postId) {
            break;
        }
        out.unshift(t);
    }
    out.push(sorted[anchorIdx]);
    return out;
}

/**
 * Build a ToolCall[] from every tool_use block across the turns that belong
 * to a given post's response, pairing each with its matching tool_result by
 * id. The result matches the ToolCall shape the tool UI already consumes.
 */
export function extractToolCallsForPost(conversation: ConversationResponse, postId: string): ToolCall[] {
    const turns = collectResponseTurns(conversation, postId);
    if (turns.length === 0) {
        return [];
    }

    const toolUseBlocks: ContentBlock[] = [];
    for (const t of turns) {
        for (const block of t.content) {
            if (block.type === BlockType.ToolUse) {
                toolUseBlocks.push(block);
            }
        }
    }

    if (toolUseBlocks.length === 0) {
        return [];
    }

    // Results may land AFTER the anchor when the user just approved
    // previously pending tool calls, so search every turn by tool_use_id
    // rather than only the collected response range.
    const resultMap = new Map<string, ContentBlock>();
    for (const t of conversation.turns) {
        for (const block of t.content) {
            if (block.type === BlockType.ToolResult && block.tool_use_id) {
                resultMap.set(block.tool_use_id, block);
            }
        }
    }

    return toolUseBlocks.map((block): ToolCall => {
        const resultBlock = block.id ? resultMap.get(block.id) : undefined;
        return {
            id: block.id ?? '',
            name: block.name ?? '',
            description: '',
            arguments: block.input ?? undefined,
            result: resultBlock?.content ?? undefined,
            status: statusStringToEnum(block.status),
        };
    });
}

/**
 * Extract reasoning summary text from thinking content blocks on a single
 * turn. Returns an empty summary when no thinking blocks exist.
 */
export function extractReasoningFromTurn(turn: Turn | undefined): {summary: string; signature: string} {
    if (!turn) {
        return {summary: '', signature: ''};
    }
    const thinkingBlocks = turn.content.filter((b) => b.type === BlockType.Thinking);
    if (thinkingBlocks.length === 0) {
        return {summary: '', signature: ''};
    }
    const summary = thinkingBlocks.map((b) => b.text ?? '').join('\n');
    const signature = thinkingBlocks[thinkingBlocks.length - 1]?.signature ?? '';
    return {summary, signature};
}

/** Extract Annotation[] from inline citations on text blocks. */
export function extractAnnotationsFromTurn(turn: Turn | undefined): Annotation[] {
    if (!turn) {
        return [];
    }

    const annotations: Annotation[] = [];
    let runningIndex = 0;

    for (const block of turn.content) {
        if (block.type === BlockType.Text && block.citations) {
            for (const c of block.citations) {
                annotations.push({
                    type: 'url_citation',
                    start_index: c.start_index,
                    end_index: c.end_index,
                    url: c.url ?? '',
                    title: c.title ?? '',
                    index: runningIndex,
                });
                runningIndex++;
            }
        }
    }

    return annotations;
}

/**
 * Returns the server-computed approval stage for the post's anchor turn.
 * Defaults to 'done' (no buttons) when the anchor or the field is missing —
 * safer than defaulting to a stage that would render approval controls.
 */
export function deriveApprovalStageForPost(conversation: ConversationResponse, postId: string): ToolApprovalStage {
    const anchor = conversation.turns.find((t) => t.post_id === postId && t.role === 'assistant');
    return anchor?.approval_state ?? ToolApprovalStage.Done;
}

/** True if any tool_use carries arguments (requester or shared block). */
export function anyToolHasArguments(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.arguments != null);
}

/** True if any tool_result carries content (requester or shared block). */
export function anyToolHasResult(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.result != null);
}

// Re-export for tests and external consumers that want the private helper.
export {collectResponseTurns};
