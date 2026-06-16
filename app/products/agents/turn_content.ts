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
    type Reasoning,
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
export function collectResponseTurns(conversation: ConversationResponse, postId: string): Turn[] {
    const sorted = [...conversation.turns].sort((a, b) => a.sequence - b.sequence);
    let anchorIdx = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].post_id === postId && sorted[i].role === 'assistant') {
            anchorIdx = i;
            break;
        }
    }
    if (anchorIdx === -1) {
        return [];
    }

    const out: Turn[] = [];
    for (let i = anchorIdx - 1; i >= 0; i--) {
        const t = sorted[i];
        if (t.role === 'user') {
            break;
        }

        // Crossed into a foreign post's response; stop or we'd sweep in its tool_use blocks.
        if (t.post_id && t.post_id !== postId) {
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
        description: '',
        arguments: block.input ?? undefined,
        result: resultBlock?.content ?? undefined,
        status: statusStringToEnum(block.status),
    };
}

export function extractReasoningFromTurn(turn: Turn | undefined): Reasoning {
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

// Build the ordered rounds for a post's response: one Round per assistant turn,
// in sequence order, so multi-step tool answers render in their true order
// instead of being flattened into a single block.
export function buildRoundsFromTurns(conversation: ConversationResponse, postId: string): Round[] {
    const turns = collectResponseTurns(conversation, postId);
    if (turns.length === 0) {
        return [];
    }

    const resultMap = buildToolResultMap(conversation);
    const rounds: Round[] = [];
    for (const turn of turns) {
        if (turn.role !== 'assistant') {
            continue;
        }
        const text = turn.content.
            filter((b) => b.type === BlockType.Text).
            map((b) => b.text ?? '').
            join('');
        const toolCalls = turn.content.
            filter((b) => b.type === BlockType.ToolUse).
            map((block) => toolUseBlockToToolCall(block, resultMap));
        rounds.push({
            id: turn.id,
            text,
            toolCalls,
            reasoning: extractReasoningFromTurn(turn),
            annotations: extractAnnotationsFromTurn(turn),
        });
    }
    return rounds;
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
