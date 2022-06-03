// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {storeMyChannelsForTeam, markChannelAsUnread, markChannelAsViewed, updateLastPostAt} from '@actions/local/channel';
import {markPostAsDeleted} from '@actions/local/post';
import {createThreadFromNewPost, updateThread} from '@actions/local/thread';
import {fetchChannelStats, fetchMyChannel, markChannelAsRead} from '@actions/remote/channel';
import {fetchPostAuthors, fetchPostById} from '@actions/remote/post';
import {fetchThread} from '@actions/remote/thread';
import {ActionType, Events, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getCurrentChannelId, getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
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

    const {database} = operator;

    let post: Post;
    try {
        post = JSON.parse(msg.data.post);
    } catch {
        return;
    }
    const currentUserId = await getCurrentUserId(database);

    const existing = await getPostById(database, post.pending_post_id);

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

    models.push(...postModels);

    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled) {
        const {models: threadModels} = await createThreadFromNewPost(serverUrl, post, true);
        if (threadModels?.length) {
            models.push(...threadModels);
        }
    }

    // Ensure the channel membership
    let myChannel = await getMyChannel(database, post.channel_id);
    if (myChannel) {
        const isCrtReply = isCRTEnabled && post.root_id !== '';

        // Don't change lastPostAt if the post is thread post
        if (!isCrtReply) {
            const {member} = await updateLastPostAt(serverUrl, post.channel_id, post.create_at, false);
            if (member) {
                myChannel = member;
            }
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

        myChannel = await getMyChannel(database, post.channel_id);
        if (!myChannel) {
            return;
        }
    }

    // If we don't have the root post for this post, fetch it from the server
    if (post.root_id) {
        const rootPost = await getPostById(database, post.root_id);

        if (!rootPost) {
            fetchPostById(serverUrl, post.root_id);
        }
    }

    const currentChannelId = await getCurrentChannelId(database);

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
        models.push(...authorsModels);
    }

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

                const isChannelScreenMounted = EphemeralStore.getNavigationComponents().includes(Screens.CHANNEL);

                const isTabletDevice = await isTablet();
                if (isChannelScreenMounted || isTabletDevice) {
                    markAsViewed = false;
                    markAsRead = true;
                }
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
        } else if (!isCRTEnabled || !post.root_id) {
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
    const {database} = operator;

    const oldPost = await getPostById(database, post.id);
    if (oldPost && oldPost.isPinned !== post.is_pinned) {
        fetchChannelStats(serverUrl, post.channel_id);
    }

    const {authors} = await fetchPostAuthors(serverUrl, [post], true);
    if (authors?.length) {
        const authorsModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
        models.push(...authorsModels);
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
        prepareRecordsOnly: true,
    });
    models.push(...postModels);

    operator.batchRecords(models);
}

export async function handlePostDeleted(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    try {
        const {database} = operator;

        const post: Post = JSON.parse(msg.data.post);

        const models: Model[] = [];

        const {model: deleteModel} = await markPostAsDeleted(serverUrl, post, true);
        if (deleteModel) {
            models.push(deleteModel);
        }

        // update thread when a reply is deleted and CRT is enabled
        if (post.root_id) {
            const isCRTEnabled = await getIsCRTEnabled(database);
            if (isCRTEnabled) {
                // Update reply_count of the thread;
                // Note: reply_count includes current deleted count, So subtract 1 from reply_count
                const {model: threadModel} = await updateThread(serverUrl, post.root_id, {reply_count: post.reply_count - 1}, true);
                if (threadModel) {
                    models.push(threadModel);
                }

                const channel = await getChannelById(database, post.channel_id);
                if (channel) {
                    let {teamId} = channel;
                    if (!teamId) {
                        teamId = await getCurrentTeamId(database); // In case of DM/GM
                    }
                    fetchThread(serverUrl, teamId, post.root_id);
                }
            }
        }

        if (models.length) {
            await operator.batchRecords(models);
        }
    } catch {
        // Do nothing
    }
}

export async function handlePostUnread(serverUrl: string, msg: WebSocketMessage) {
    const {channel_id: channelId, team_id: teamId} = msg.broadcast;
    const {
        mention_count: mentionCount,
        mention_count_root: mentionCountRoot,
        msg_count: msgCount,
        msg_count_root: msgCountRoot,
        last_viewed_at: lastViewedAt,
    } = msg.data;

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }
    const [myChannel, isCRTEnabled] = await Promise.all([
        getMyChannel(database, channelId),
        getIsCRTEnabled(database),
    ]);

    let messages = msgCount;
    let mentions = mentionCount;
    if (isCRTEnabled) {
        messages = msgCountRoot;
        mentions = mentionCountRoot;
    }

    if (!myChannel?.manuallyUnread) {
        const {channels} = await fetchMyChannel(serverUrl, teamId, channelId, true);
        const channel = channels?.[0];
        const postNumber = isCRTEnabled ? channel?.total_msg_count_root : channel?.total_msg_count;
        const delta = postNumber ? postNumber - messages : messages;

        markChannelAsUnread(serverUrl, channelId, delta, mentions, lastViewedAt);
    }
}
