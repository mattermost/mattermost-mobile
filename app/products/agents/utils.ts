// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Check if a post is an agent post
 */
export function isAgentPost(post: PostModel | Post): boolean {
    return post.type === AGENT_POST_TYPES.LLMBOT ||
           post.type === AGENT_POST_TYPES.LLM_POSTBACK;
}

/**
 * Check if the current user is the requester of an agent post
 * @param post The agent post
 * @param currentUserId The current user ID
 * @returns true if current user is the requester
 */
export function isPostRequester(post: PostModel | Post, currentUserId: string): boolean {
    try {
        const props = post.props as Record<string, unknown>;
        return props?.llm_requester_user_id === currentUserId;
    } catch {
        return false;
    }
}

/**
 * Check if a post has redacted tool call data (private arguments hidden from channel)
 */
export function isToolCallRedacted(post: PostModel | Post): boolean {
    try {
        const props = post.props as Record<string, unknown>;
        return props?.pending_tool_call_redacted === 'true';
    } catch {
        return false;
    }
}

/**
 * Check if a post is pending tool result approval
 */
export function isPendingToolResult(post: PostModel | Post): boolean {
    try {
        const props = post.props as Record<string, unknown>;
        return props?.pending_tool_result === 'true';
    } catch {
        return false;
    }
}

/**
 * Determine the current tool approval stage for a post
 */
export function getToolApprovalStage(post: PostModel | Post, toolCalls: ToolCall[]): ToolApprovalStage | null {
    if (isPendingToolResult(post)) {
        return ToolApprovalStage.Result;
    }
    if (toolCalls.some((tc) => tc.status === ToolCallStatus.Pending)) {
        return ToolApprovalStage.Call;
    }
    return null;
}

/**
 * Merge public tool calls with private data, preserving status from public and arguments/results from private
 */
export function mergeToolCalls(publicCalls: ToolCall[], privateCalls: ToolCall[] | null): ToolCall[] {
    if (!privateCalls?.length) {
        return publicCalls;
    }

    const publicById = new Map(publicCalls.map((tc) => [tc.id, tc]));

    return privateCalls.map((privateTool) => {
        const publicTool = publicById.get(privateTool.id);
        if (!publicTool) {
            return privateTool;
        }
        return {
            ...publicTool,
            arguments: privateTool.arguments,
            ...(privateTool.result != null && {result: privateTool.result}),
        };
    });
}
