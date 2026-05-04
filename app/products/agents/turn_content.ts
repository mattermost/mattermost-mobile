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

// The anchor (whose post_id matches) is the highest-sequence turn in the
// response, so tool-round turns sit before it. Walk backwards until a user
// turn or a foreign post's anchor.
export function collectResponseTurns(conversation: ConversationResponse, postId: string): Turn[] {
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

        // Crossed into a foreign post's response; stop or we'd sweep in its tool_use blocks.
        if (t.post_id && t.post_id !== postId) {
            break;
        }
        out.unshift(t);
    }
    out.push(sorted[anchorIdx]);
    return out;
}

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

    // Results may land after the anchor when newly-approved tools resolve, so
    // search every turn instead of only the collected response range.
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

// Defaults to Done when the anchor or approval_state is missing so the UI
// fails closed (no buttons) rather than rendering approval controls in error.
export function deriveApprovalStageForPost(conversation: ConversationResponse, postId: string): ToolApprovalStage {
    const anchor = conversation.turns.find((t) => t.post_id === postId && t.role === 'assistant');
    return anchor?.approval_state ?? ToolApprovalStage.Done;
}

export function anyToolHasArguments(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.arguments != null);
}

export function anyToolHasResult(toolCalls: ToolCall[]): boolean {
    return toolCalls.some((tc) => tc.result != null);
}
