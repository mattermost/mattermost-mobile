// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {storeMyChannelsForTeam, markChannelAsUnread, markChannelAsViewed, updateLastPostAt} from '@actions/local/channel';
import {markPostAsDeleted} from '@actions/local/post';
import {fetchMyChannel, markChannelAsRead} from '@actions/remote/channel';
import {fetchPostAuthors, fetchPostById} from '@actions/remote/post';
import {ActionType, Events} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryMyChannel} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentChannelId, queryCurrentUserId} from '@queries/servers/system';
import {isFromWebhook, isSystemMessage, shouldIgnorePost} from '@utils/post';

import type {WebSocketMessage} from '@typings/api/websocket';

const {SERVER: {POST}} = MM_TABLES;

export async function handleNewPostEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const post: Post = JSON.parse(msg.data.post);
    const currentUserId = await queryCurrentUserId(database.database);

    const existing = await queryPostById(database.database, post.pending_post_id);

    if (existing) {
        return;
    }

    database.operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
    });

    const models: Model[] = [];

    // Ensure the channel membership
    let myChannel = await queryMyChannel(database.database, post.channel_id);
    if (!myChannel) {
        const myChannelRequest = await fetchMyChannel(serverUrl, '', post.channel_id, true);
        if (myChannelRequest.error) {
            return;
        }

        // We want to have this on the database so we can make any needed update later
        const myChannelModels = await storeMyChannelsForTeam(serverUrl, '', myChannelRequest.channels!, myChannelRequest.memberships!, false);
        if (myChannelModels.error) {
            return;
        }

        myChannel = await queryMyChannel(database.database, post.channel_id);
        if (!myChannel) {
            return;
        }
    }

    // If we don't have the root post for this post, fetch it from the server
    if (post.root_id) {
        const rootPost = await queryPostById(database.database, post.root_id);

        if (!rootPost) {
            fetchPostById(serverUrl, post.root_id);
        }
    }

    const currentChannelId = await queryCurrentChannelId(database.database);

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

    fetchPostAuthors(serverUrl, [post]);

    //const viewingGlobalThreads = getViewingGlobalThreads(state);
    // const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
    // actions.push(receivedNewPost(post, collapsedThreadsEnabled));
    if (shouldIgnorePost(post)) {
        const {member} = await updateLastPostAt(serverUrl, post.channel_id, post.create_at, true);
        if (member) {
            models.push(member);
        }
    } else {
        let markAsViewed = false;
        let markAsRead = false;

        if (!myChannel.manuallyUnread) {
            if (
                post.user_id === currentUserId &&
                !isSystemMessage(post) &&
                !isFromWebhook(post)
            ) {
                markAsViewed = true;
                markAsRead = false;
            } else if ((post.channel_id === currentChannelId)) { // TODO: THREADS && !viewingGlobalThreads) {
                // Don't mark as read if we're in global threads screen
                // the currentChannelId still refers to previously viewed channel
                markAsViewed = false;
                markAsRead = true;
            }
        }

        if (markAsRead) {
            markChannelAsRead(serverUrl, post.channel_id);
            const {member} = await updateLastPostAt(serverUrl, post.channel_id, post.create_at, true);
            if (member) {
                models.push(member);
            }
        } else if (markAsViewed) {
            const {member: viewedAt} = await markChannelAsViewed(serverUrl, post.channel_id, post.create_at, true);
            if (viewedAt) {
                models.push(viewedAt);
            }
        } else {
            const hasMentions = msg.data.mentions.includes(currentUserId);
            const {member: unreadAt} = await markChannelAsUnread(serverUrl, post.channel_id, myChannel.messageCount + 1, myChannel.mentionsCount + (hasMentions ? 1 : 0), false, post.create_at, undefined, true);
            if (unreadAt) {
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

    const post: Post = JSON.parse(msg.data.post);

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
    const data: Post = JSON.parse(msg.data.post);

    markPostAsDeleted(serverUrl, data);
}

export async function handlePostUnread(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const postNumber = await database.database.get(POST).query(Q.where('channel_id', msg.broadcast.channel_id)).fetchCount();
    const delta = postNumber - msg.data.msg_count;
    markChannelAsUnread(serverUrl, msg.broadcast.channel_id, delta, msg.data.mention_count, true, undefined, msg.data.last_viewed_at);
}
