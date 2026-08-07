// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Resolve which agent/bot should be selected when a selector opens.
 * Precedence: saved preference (if still available) -> system default -> first.
 * `isDefault` matches the camelCase field on the plugin's /ai_bots wire shape;
 * the server omits it when false.
 */
export function resolveSelectedAgent<T extends {id: string; isDefault?: boolean}>(agents: T[], savedPrefId?: string | null): T | null {
    if (agents.length === 0) {
        return null;
    }

    if (savedPrefId) {
        const saved = agents.find((a) => a.id === savedPrefId);
        if (saved) {
            return saved;
        }
    }

    return agents.find((a) => a.isDefault) ?? agents[0];
}

/**
 * Shared agent-selection rule for action entry points (channel/thread
 * analysis, custom prompts, unreads summarization): only surface an agent
 * picker when the user actually has a choice.
 *
 * - 0 agents  -> {agent: null, showPicker: false}: caller renders its empty state.
 * - 1 agent   -> {agent, showPicker: false}: use it silently, no picker.
 * - >1 agents -> {agent, showPicker: true}: `agent` is the resolved
 *   preselection (saved preference -> default -> first).
 */
export function resolveAgentSelection<T extends {id: string; isDefault?: boolean}>(
    agents: T[],
    savedPrefId?: string | null,
): {agent: T | null; showPicker: boolean} {
    if (agents.length <= 1) {
        return {agent: agents[0] ?? null, showPicker: false};
    }

    return {agent: resolveSelectedAgent(agents, savedPrefId), showPicker: true};
}

/**
 * Check if a post is an agent post
 */
export function isAgentPost(post: PostModel | Post): boolean {
    return post.type === AGENT_POST_TYPES.LLMBOT ||
           post.type === AGENT_POST_TYPES.LLM_POSTBACK;
}

/**
 * Check if a post is an agent @mention reminder post (an interactive "loop in
 * the agent" hint). Distinct from isAgentPost so it routes to its own renderer,
 * not the streaming AgentPost.
 */
export function isAgentMentionReminderPost(post: PostModel | Post): boolean {
    return post.type === AGENT_POST_TYPES.AGENT_MENTION_REMINDER;
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
 * Determine the current tool approval stage for a post. Returns Done when
 * there is no outstanding user decision (no pending tools and no redacted
 * result flag).
 */
export function getToolApprovalStage(post: PostModel | Post, toolCalls: ToolCall[]): ToolApprovalStage {
    if (isPendingToolResult(post)) {
        return ToolApprovalStage.Result;
    }
    if (toolCalls.some((tc) => tc.status === ToolCallStatus.Pending)) {
        return ToolApprovalStage.Call;
    }
    return ToolApprovalStage.Done;
}

/**
 * Merge public tool calls with private data, preserving status from public and arguments/results from private
 */
export function mergeToolCalls(publicCalls: ToolCall[], privateCalls: ToolCall[] | null): ToolCall[] {
    if (!privateCalls?.length) {
        return publicCalls;
    }

    const privateById = new Map(privateCalls.map((tc) => [tc.id, tc]));

    const merged = publicCalls.map((publicTool) => {
        const privateTool = privateById.get(publicTool.id);
        if (!privateTool) {
            return publicTool;
        }
        privateById.delete(publicTool.id);
        return {
            ...publicTool,
            arguments: privateTool.arguments,
            ...(privateTool.result != null && {result: privateTool.result}),
        };
    });

    // Append any private-only tools not found in public calls
    for (const privateTool of privateById.values()) {
        merged.push(privateTool);
    }

    return merged;
}
