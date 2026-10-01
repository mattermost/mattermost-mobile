// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import {CONTROL_SIGNALS} from '@agents/constants';
import conversationStore from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';
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

    // A settling stream (`end`/`cancel`) is the moment the server has
    // finalised the response turns, so refresh the cached conversation here
    // rather than only from the mounted post component, which can miss the
    // transition (coalesced start/end renders) or not be mounted at all.
    // Webapp parity: llmbot_post invalidates the conversation on `end`.
    const {control, post_id} = msg.data;
    if (post_id && (control === CONTROL_SIGNALS.END || control === CONTROL_SIGNALS.CANCEL)) {
        settleStreamedPost(serverUrl, post_id);
    }
}

/**
 * Hand a finished stream over to the persisted conversation. The streamed
 * content stays on screen until the refetch lands (the plugin edits the post
 * before sending `end`, so POST_EDITED is too early), then the streaming state
 * is dropped in the same update. Posts whose conversation was never viewed
 * have nothing cached to refresh; the first view fetches fresh data anyway.
 */
export async function settleStreamedPost(serverUrl: string, postId: string): Promise<void> {
    const dropStreamingState = () => streamingStore.removePost(serverUrl, postId);
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        const conversationId = (post?.props as Record<string, unknown> | undefined)?.conversation_id;
        if (typeof conversationId !== 'string' || conversationId === '') {
            logDebug('[settleStreamedPost] no conversation_id on post', {postId});
            dropStreamingState();
            return;
        }
        const cached = conversationStore.getState(serverUrl, conversationId);
        if (!cached.conversation && !cached.loading && !cached.error) {
            dropStreamingState();
            return;
        }

        // Await so normalization/store rejections hit this catch instead of
        // surfacing as unhandled promise rejections.
        await refetchConversation(serverUrl, conversationId, dropStreamingState);
    } catch (error) {
        logDebug('error on settleStreamedPost', getFullErrorMessage(error));
        dropStreamingState();
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
