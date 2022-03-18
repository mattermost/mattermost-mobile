// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {storeMyChannelsForTeam, markChannelAsUnread, markChannelAsViewed, updateLastPostAt} from '@actions/local/channel';
import {markPostAsDeleted} from '@actions/local/post';
import {fetchMyChannel, markChannelAsRead} from '@actions/remote/channel';
import {fetchPostAuthors, fetchPostById} from '@actions/remote/post';
import {ActionType, Events} from '@constants';
import DatabaseManager from '@database/manager';
import {queryMyChannel} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentChannelId, queryCurrentUserId} from '@queries/servers/system';
import {isFromWebhook, isSystemMessage, shouldIgnorePost} from '@utils/post';

import type MyChannelModel from '@typings/database/models/servers/my_channel';

function preparedMyChannelHack(myChannel: MyChannelModel) {
    // @ts-expect-error hack accessing _preparedState
    if (!myChannel._preparedState) {
        // @ts-expect-error hack setting _preparedState
        myChannel._preparedState = null;
    }
}

export async function handleNewPostEvent(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    let post: Post;
    try {
        post = JSON.parse(msg.data.post);
    } catch {
        return;
    }
    const currentUserId = await queryCurrentUserId(operator.database);

    const existing = await queryPostById(operator.database, post.pending_post_id);

    if (existing) {
        return;
    }

    const models: Model[] = [];

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
        prepareRecordsOnly: true,
    });

    if (postModels?.length) {
        models.push(...postModels);
    }

    // Ensure the channel membership
    let myChannel = await queryMyChannel(operator.database, post.channel_id);
    if (myChannel) {
        const {member} = await updateLastPostAt(serverUrl, post.channel_id, post.create_at, false);
        if (member) {
            myChannel = member;
        }
    } else {
        const myChannelRequest = await fetchMyChannel(serverUrl, '', post.channel_id, true);
        if (myChannelRequest.error) {
            return;
        }

        // We want to have this on the database so we can make any needed update later
        const myChannelModels = await storeMyChannelsForTeam(serverUrl, '', myChannelRequest.channels!, myChannelRequest.memberships!, false);
        if (myChannelModels.error) {
            return;
        }

        myChannel = await queryMyChannel(operator.database, post.channel_id);
        if (!myChannel) {
            return;
        }
    }

    // If we don't have the root post for this post, fetch it from the server
    if (post.root_id) {
        const rootPost = await queryPostById(operator.database, post.root_id);

        if (!rootPost) {
            fetchPostById(serverUrl, post.root_id);
        }
    }

    const currentChannelId = await queryCurrentChannelId(operator.database);

    if (post.channel_id === currentChannelId) {
        const data = {
            channelId: post.channel_id,
            rootId: post.root_id,
            userId: post.user_id,
            now: Date.now(),
        };
        DeviceEventEmitter.emit(Events.USER_STOP_TYPING, data);
    }

    const {authors} = await fetchPostAuthors(serverUrl, [post], true);
    if (authors?.length) {
        const authorsModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
        if (authorsModels.length) {
            models.push(...authorsModels);
        }
    }

    // TODO Thread related functionality: https://mattermost.atlassian.net/browse/MM-41084
    //const viewingGlobalThreads = getViewingGlobalThreads(state);
    // const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
    // actions.push(receivedNewPost(post, collapsedThreadsEnabled));

    if (!shouldIgnorePost(post)) {
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
        } else if (markAsViewed) {
            preparedMyChannelHack(myChannel);
            const {member: viewedAt} = await markChannelAsViewed(serverUrl, post.channel_id, true);
            if (viewedAt) {
                models.push(viewedAt);
            }
        } else {
            const hasMentions = msg.data.mentions?.includes(currentUserId);
            preparedMyChannelHack(myChannel);
            const {member: unreadAt} = await markChannelAsUnread(
                serverUrl,
                post.channel_id,
                myChannel.messageCount + 1,
                myChannel.mentionsCount + (hasMentions ? 1 : 0),
                myChannel.lastViewedAt,
                true,
            );
            if (unreadAt) {
                models.push(unreadAt);
            }
        }
    }

    operator.batchRecords(models);
}

export async function handlePostEdited(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    let post: Post;
    try {
        post = JSON.parse(msg.data.post);
    } catch {
        return;
    }

    const models: Model[] = [];

    const {authors} = await fetchPostAuthors(serverUrl, [post], true);
    if (authors?.length) {
        const authorsModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
        if (authorsModels.length) {
            models.push(...authorsModels);
        }
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
        prepareRecordsOnly: true,
    });
    if (postModels.length) {
        models.push(...postModels);
    }

    if (models.length) {
        operator.batchRecords(models);
    }
}

export function handlePostDeleted(serverUrl: string, msg: WebSocketMessage) {
    try {
        const data: Post = JSON.parse(msg.data.post);
        markPostAsDeleted(serverUrl, data);
    } catch {
        // Do nothing
    }
}

export async function handlePostUnread(serverUrl: string, msg: WebSocketMessage) {
    const {team_id: teamId, channel_id: channelId} = msg.broadcast;
    const {mention_count: mentionCount, msg_count: msgCount, last_viewed_at: lastViewedAt} = msg.data;
    const {channels} = await fetchMyChannel(serverUrl, teamId, channelId, true);
    const channel = channels?.[0];
    const postNumber = channel?.total_msg_count;
    const delta = postNumber ? postNumber - msgCount : msgCount;
    markChannelAsUnread(serverUrl, channelId, delta, mentionCount, lastViewedAt);
}
