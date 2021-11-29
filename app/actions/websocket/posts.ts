// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {localMyChannels, markChannelAsUnread, markChannelAsViewed} from '@actions/local/channel';
import {removePostById} from '@actions/local/post';
import {fetchMyChannel, markChannelAsRead} from '@actions/remote/channel';
import {fetchPostAuthors} from '@actions/remote/post';
import {ActionType, Events, WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {queryMyChannel} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentChannelId, queryCurrentUserId} from '@queries/servers/system';
import {isFromWebhook, isSystemMessage, shouldIgnorePost} from '@utils/post';

import type {WebSocketMessage} from '@typings/api/websocket';

export async function handleNewPostEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const postFromData = JSON.parse(msg.data.post);
    const currentUserId = await queryCurrentUserId(database.database);
    const post: Post = {
        ...postFromData,
        ownPost: postFromData.user_id === currentUserId,
    };

    const existing = await queryPostById(database.database, post.pending_post_id);

    if (existing) {
        return;
    }

    database.operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
    });

    const currentChannelId = await queryCurrentChannelId(database.database);
    if (currentChannelId === post.channel_id) {
        DeviceEventEmitter.emit(WebsocketEvents.INCREASE_POST_VISIBILITY_BY_ONE);
    }

    const models: Model[] = [];
    const myChannel = await queryMyChannel(database.database, post.channel_id);
    if (!myChannel) {
        const myChannelRequest = await fetchMyChannel(serverUrl, '', post.channel_id, true);
        if (!myChannelRequest.error) {
            const myChannelModels = await localMyChannels(serverUrl, '', myChannelRequest.channels!, myChannelRequest.memberships!, true);
            if (myChannelModels.models) {
                models.push(...myChannelModels.models);
            }
        }
    }

    // If we don't have the thread for this post, fetch it from the server
    // and include the actions in the batch
    if (post.root_id) {
        const rootPost = await queryPostById(database.database, post.root_id);

        if (!rootPost) {
            // const thread: any = await dispatch(getPostThread(post.root_id, true));
            // if (thread.data?.length) {
            //     actions.push(...thread.data);
            // }
        }
    }

    if (post.channel_id === currentChannelId) {
        const data = {
            channelId: post.channel_id,
            rootId: post.root_id,
            userId: post.user_id,
            username: '',
            now: Date.now(),
        };
        DeviceEventEmitter.emit(Events.USER_STOP_TYPING, data);
    }

    // Fetch and batch additional post data
    // TODO: Currently seems we are not fetching this. Am I missing something?
    // const additional: any = await dispatch(getPostsAdditionalDataBatch([post]));
    // if (additional.data.length) {
    //     actions.push(...additional.data);
    // }

    // TODO: Needed?
    // if (msg.data.channel_type === General.DM_CHANNEL) {
    //     const otherUserId = getUserIdFromChannelName(currentUserId, msg.data.channel_name);
    //     const dmAction = makeDirectChannelVisibleIfNecessary(state, otherUserId);
    //     if (dmAction) {
    //         actions.push(dmAction);
    //     }
    // } else if (msg.data.channel_type === General.GM_CHANNEL) {
    //     const gmActions = await makeGroupMessageVisibleIfNecessary(state, post.channel_id);
    //     if (gmActions) {
    //         actions.push(...gmActions);
    //     }
    // }

    //const viewingGlobalThreads = getViewingGlobalThreads(state);
    // const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
    // actions.push(receivedNewPost(post, collapsedThreadsEnabled));
    if (!shouldIgnorePost(post)) {
        let markAsRead = false;
        let markAsReadOnServer = false;

        if (!myChannel?.manuallyUnread) {
            if (
                post.user_id === currentUserId &&
                !isSystemMessage(post) &&
                !isFromWebhook(post)
            ) {
                markAsRead = true;
                markAsReadOnServer = false;
            } else if ((post.channel_id === currentChannelId)) { // TODO: THREADS && !viewingGlobalThreads) {
                // Don't mark as read if we're in global threads screen
                // the currentChannelId still refers to previously viewed channel
                markAsRead = true;
                markAsReadOnServer = true;
            }
        }

        if (markAsRead && markAsReadOnServer) {
            markChannelAsRead(serverUrl, post.channel_id);
        } else if (markAsRead) {
            const viewedAt = await markChannelAsViewed(serverUrl, post.channel_id, true);
            if (viewedAt instanceof Model) {
                models.push(viewedAt);
            }
        } else {
            const unreadAt = markChannelAsUnread(serverUrl, post.channel_id, 1, msg.data.mentions, false, true);
            if (unreadAt instanceof Model) {
                models.push(unreadAt);
            }
        }
    }

    database.operator.batchRecords(models);
}

export async function handlePostEdited(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const currentUserId = await queryCurrentUserId(database.database);
    const data = JSON.parse(msg.data.post);
    const post = {
        ...data,
        ownPost: data.user_id === currentUserId,
    };

    try {
        fetchPostAuthors(serverUrl, [post]);
    } catch {
        // Do nothing
    }

    database.operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
    });
}

export function handlePostDeleted(serverUrl: string, msg: WebSocketMessage) {
    const data = JSON.parse(msg.data.post);

    removePostById(serverUrl, data.id);
}

export async function handlePostUnread(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const myChannel = await queryMyChannel(database.database, msg.broadcast.channel_id);

    if (!myChannel?.manuallyUnread) {
        const delta = myChannel ? myChannel.messageCount - msg.data.msg_count : msg.data.msg_count;
        markChannelAsUnread(serverUrl, msg.broadcast.channel_id, delta, msg.data.mention_count, true);
    }
}
