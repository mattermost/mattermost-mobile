// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import {CONTROL_SIGNALS} from '@agents/constants';
import conversationStore from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';
import {getResponseAnchorSequence} from '@agents/turn_content';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {PostUpdateWebsocketMessage} from '@agents/types';

/**
 * Handle agent post update WebSocket events
 * Called when the server sends streaming updates for agent responses
 */
export function handleAgentPostUpdate(serverUrl: string, msg: WebSocketMessage<PostUpdateWebsocketMessage>): void {
    if (!msg.data) {
        return;
    }

    // Delegate to the streaming store
    streamingStore.handleWebSocketMessage(serverUrl, msg.data);

    // `end` is the moment the server has finalised the response turns (a
    // `cancel` is always followed by one), so refresh the cached conversation
    // here rather than only from the mounted post component, which can miss
    // the transition (coalesced start/end renders) or not be mounted at all.
    // Webapp parity: llmbot_post invalidates the conversation on `end`.
    const {control, post_id} = msg.data;
    if (post_id && control === CONTROL_SIGNALS.END) {
        settleStreamedPost(serverUrl, post_id);
    }
}

/**
 * Hand a finished stream over to the persisted conversation. The streamed
 * content stays on screen until the refetch lands (the plugin edits the post
 * before sending `end`, so POST_EDITED is too early), then the streaming state
 * is dropped in the same update — unless the post started streaming again in
 * the meantime. Posts whose conversation was never viewed have nothing cached
 * to refresh; the first view fetches fresh data anyway.
 *
 * Posts without a conversation render `post.message`, so POST_EDITED drops
 * their state once the edited post is stored. After a reconnect that edit may
 * have been missed, so `afterReconnect` drops it here.
 *
 * After a reconnect it is unknown whether the stream ended or is still running
 * (the plugin only persists the response when it finishes), so the state is
 * only dropped once the refetch shows a newer response anchor for the post.
 * Otherwise it is kept, so a live stream doesn't lose its rounds and tool calls.
 */
export async function settleStreamedPost(serverUrl: string, postId: string, afterReconnect = false): Promise<void> {
    const dropStreamingState = () => {
        if (!streamingStore.isStreaming(serverUrl, postId)) {
            streamingStore.removePost(serverUrl, postId);
        }
    };
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        const conversationId = (post?.props as Record<string, unknown> | undefined)?.conversation_id;
        if (typeof conversationId !== 'string' || conversationId === '') {
            logDebug('[settleStreamedPost] no conversation_id on post', {postId, afterReconnect});
            if (afterReconnect) {
                dropStreamingState();
            }
            return;
        }
        const cached = conversationStore.getState(serverUrl, conversationId);
        if (!cached.conversation && !cached.loading && !cached.error) {
            dropStreamingState();
            return;
        }

        let onSettled = dropStreamingState;
        if (afterReconnect) {
            const baseline = cached.conversation ? getResponseAnchorSequence(cached.conversation, postId) : -1;
            onSettled = () => {
                const {conversation} = conversationStore.getState(serverUrl, conversationId);
                if (conversation && getResponseAnchorSequence(conversation, postId) > baseline) {
                    dropStreamingState();
                }
            };
        }

        // Await so normalization/store rejections hit this catch instead of
        // surfacing as unhandled promise rejections.
        await refetchConversation(serverUrl, conversationId, onSettled);
    } catch (error) {
        logDebug('error on settleStreamedPost', getFullErrorMessage(error));
        if (!afterReconnect) {
            dropStreamingState();
        }
    }
}

/**
 * Handle a conversation-level update broadcast from the plugin (plugin >= 2.0).
 * Forces a re-fetch so subscribers see the latest turns. No-op if the event
 * arrives without a conversation_id payload.
 */
export function handleAgentConversationUpdated(
    serverUrl: string,
    msg: WebSocketMessage<{conversation_id?: string}>,
): void {
    const conversationId = msg.data?.conversation_id;
    if (!conversationId) {
        return;
    }
    refetchConversation(serverUrl, conversationId);
}
