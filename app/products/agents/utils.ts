// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';
import {ChannelAccessLevel, ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Resolve which agent/bot should be selected when a selector opens.
 * Precedence: saved preference (if still available) -> system default -> first.
 * `isDefault` is tolerated when absent (the plugin omits it when false).
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
 * Filter agents to those usable in a given channel, mirroring the plugin
 * webapp's useBotlistForChannel predicate: All always passes; Allow requires
 * the channel to be listed in channelIds; Block requires it not to be. Agents
 * disallowed here would be rejected (403) by the server on use.
 */
export function filterAgentsForChannel<T extends {channelAccessLevel: ChannelAccessLevel; channelIds?: string[] | null}>(agents: T[], channelId: string): T[] {
    return agents.filter((agent) => {
        const channelIds = agent.channelIds ?? [];
        return agent.channelAccessLevel === ChannelAccessLevel.All ||
            (agent.channelAccessLevel === ChannelAccessLevel.Allow && channelIds.includes(channelId)) ||
            (agent.channelAccessLevel === ChannelAccessLevel.Block && !channelIds.includes(channelId));
    });
}

/**
 * Resolve the agent an entry point should use and whether an agent picker is
 * warranted. Pickers only appear when more than one agent is available; with
 * exactly one agent, it is used silently.
 */
export function resolveAgentSelection<T extends {id: string; isDefault?: boolean}>(agents: T[], savedPrefId?: string | null): {agent: T | null; showPicker: boolean} {
    return {
        agent: resolveSelectedAgent(agents, savedPrefId),
        showPicker: agents.length > 1,
    };
}

/**
 * Build the composer draft for a rendered custom prompt. Outside a bot DM the
 * agent's @mention is prepended so the agent actually answers when the message
 * is posted (webapp parity: custom_prompts_dropdown.tsx); inside a bot DM the
 * rendered text is used as-is.
 */
export function buildCustomPromptDraft(rendered: string, botUsername: string | undefined, isBotDMChannel: boolean): string {
    if (!isBotDMChannel && botUsername) {
        return `@${botUsername} ${rendered}`;
    }
    return rendered;
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
 * Whether an agent post's markdown must be rendered with links/hashtags/LaTeX
 * disabled. The plugin tags every bot post with unsafe_links=true because the
 * content may be prompt-injected; the admin-controlled AllowUnsafeLinks server
 * config re-enables rendering (webapp parity: `unsafeLinks: !allowUnsafeLinks`).
 * @param post The agent post
 * @param allowUnsafeLinks The server's global allowUnsafeLinks config
 * @returns true when the post carries the unsafe_links prop and the config does not allow rendering
 */
export function isUnsafeLinksPost(post: PostModel | Post, allowUnsafeLinks: boolean): boolean {
    if (allowUnsafeLinks) {
        return false;
    }
    const props = post.props as Record<string, unknown> | undefined;
    return Boolean(props?.unsafe_links && props.unsafe_links !== '');
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
 * Heuristic strip of the MCP namespace prefix (`<ns>__`) from a tool's wire
 * name for call sites without server context (e.g. persisted conversation
 * payloads that carry no mcp_bare_name). Ported from the plugin webapp's
 * stripWirePrefix (webapp/src/utils/tool_names.ts) — keep the two in sync.
 */
export function stripWirePrefix(toolName: string): string {
    const idx = toolName.indexOf('__');
    if (idx <= 0) {
        return toolName;
    }
    const prefix = toolName.slice(0, idx);
    if (!(/^[a-zA-Z0-9_-]+$/).test(prefix)) {
        return toolName;
    }
    return toolName.slice(idx + 2);
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
