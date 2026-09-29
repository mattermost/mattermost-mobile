// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    LOCAL_AGENT_CHARS_PER_TOKEN,
    LOCAL_AGENT_POST_TRUNCATE_CHARS,
    LOCAL_AGENT_READ_CHANNEL_TOKEN_BUDGET,
} from '@agents/local/constants';
import {Post} from '@constants';
import {getChannelById} from '@queries/servers/channel';
import {getRecentPostsInChannel} from '@queries/servers/post';
import {queryUsersById} from '@queries/servers/user';
import {isSystemMessage} from '@utils/post';

import type {ToolArgs, ToolResult} from './types';
import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

function formatPostTime(createAt: number): string {
    const date = new Date(createAt);
    const weekday = date.toLocaleDateString('en-US', {weekday: 'short'});
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${weekday} ${hours}:${minutes}`;
}

function compactMessage(message: string): string {
    const oneLine = message.replace(/\s+/g, ' ').trim();
    if (oneLine.length <= LOCAL_AGENT_POST_TRUNCATE_CHARS) {
        return oneLine;
    }
    return `${oneLine.slice(0, LOCAL_AGENT_POST_TRUNCATE_CHARS - 1)}…`;
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / LOCAL_AGENT_CHARS_PER_TOKEN);
}

function shouldSkipPost(post: PostModel): boolean {
    if (post.deleteAt) {
        return true;
    }
    if (isSystemMessage(post)) {
        return true;
    }
    return (Post.IGNORE_POST_TYPES as string[]).includes(post.type);
}

export async function readChannel(database: Database, args: ToolArgs): Promise<ToolResult> {
    const channelId = typeof args.channel_id === 'string' ? args.channel_id.trim() : '';
    if (!channelId) {
        return {
            forToolStep: 'Error: channel_id is required',
            forAnswer: 'Error: channel_id is required',
        };
    }

    const channel = await getChannelById(database, channelId);
    if (!channel) {
        const missing = `Channel ${channelId} not found in local cache.`;
        return {forToolStep: missing, forAnswer: missing};
    }

    const sinceHours = typeof args.since_hours === 'number' && args.since_hours > 0 ? args.since_hours : undefined;
    const sinceMs = sinceHours ? Date.now() - (sinceHours * 60 * 60 * 1000) : 0;

    const posts = await getRecentPostsInChannel(database, channelId);
    const usable = posts.filter((post) => {
        if (shouldSkipPost(post)) {
            return false;
        }
        if (sinceMs && post.createAt < sinceMs) {
            return false;
        }
        return true;
    });

    const userIds = [...new Set(usable.map((post) => post.userId))];
    const users = userIds.length ? await queryUsersById(database, userIds).fetch() : [];
    const usernameById = new Map(users.map((user) => [user.id, user.username]));

    const linesNewestFirst: string[] = [];
    let tokenCount = 0;
    let truncated = false;

    for (const post of usable) {
        const username = usernameById.get(post.userId) || 'unknown';
        const line = `[${formatPostTime(post.createAt)}] @${username}: ${compactMessage(post.message || '')}`;
        const lineTokens = estimateTokens(line);
        if (tokenCount + lineTokens > LOCAL_AGENT_READ_CHANNEL_TOKEN_BUDGET) {
            truncated = true;
            break;
        }
        linesNewestFirst.push(line);
        tokenCount += lineTokens;
    }

    const chronological = [...linesNewestFirst].reverse();
    const header = `Channel ${channel.displayName} (${channel.id}). Local cache may be incomplete.`;
    let body = `${header}\nNo cached posts available.`;
    if (chronological.length) {
        const truncationNote = truncated ? '\n[truncated to fit context budget; newest posts kept]' : '';
        body = `${header}\n${chronological.join('\n')}${truncationNote}`;
    }

    const stubSuffix = truncated ? ' (truncated)' : '';
    const stub = `${chronological.length} posts loaded from ${channel.displayName}${stubSuffix}.`;
    return {forToolStep: stub, forAnswer: body};
}
