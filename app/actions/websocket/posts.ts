// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {storeMyChannelsForTeam, markChannelAsUnread, markChannelAsViewed, updateLastPostAt} from '@actions/local/channel';
import {markPostAsDeleted} from '@actions/local/post';
import {createThreadFromNewPost, updateThread} from '@actions/local/thread';
import {fetchChannelStats, fetchMyChannel} from '@actions/remote/channel';
import {fetchPostAuthors, fetchPostById} from '@actions/remote/post';
import {fetchThread} from '@actions/remote/thread';
import {ActionType, Events, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getCurrentChannelId, getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';
import {isFromWebhook, isSystemMessage, shouldIgnorePost} from '@utils/post';

import type {Model} from '@nozbe/watermelondb';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

function preparedMyChannelHack(myChannel: MyChannelModel) {
    if (!myChannel._preparedState) {
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

    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled) {
        await createThreadFromNewPost(serverUrl, post, false);
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

    const models: Model[] = [];

    const {authors} = await fetchPostAuthors(serverUrl, [post], true);
    if (authors?.length) {
        const authorsModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
        models.push(...authorsModels);
    }

    if (!shouldIgnorePost(post)) {
        let markAsViewed = false;

        if (!myChannel.manuallyUnread) {
            if (
                post.user_id === currentUserId &&
                !isSystemMessage(post) &&
                !isFromWebhook(post)
            ) {
                markAsViewed = true;
            } else if ((post.channel_id === currentChannelId)) {
                const isChannelScreenMounted = NavigationStore.getScreensInStack().includes(Screens.CHANNEL);

                const isTabletDevice = await isTablet();
                if (isChannelScreenMounted || isTabletDevice) {
                    markAsViewed = false;
                }
            }
        }

        if (markAsViewed) {
            preparedMyChannelHack(myChannel);
            const {member: viewedAt} = await markChannelAsViewed(serverUrl, post.channel_id, false, true);
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

    let actionType: string = ActionType.POSTS.RECEIVED_NEW;
    if (isCRTEnabled && post.root_id) {
        actionType = ActionType.POSTS.RECEIVED_IN_THREAD;
    }

    const postModels = await operator.handlePosts({
        actionType,
        order: [post.id],
        posts: [post],
        prepareRecordsOnly: true,
    });

    models.push(...postModels);

    operator.batchRecords(models, 'handleNewPostEvent');
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

    let actionType: string = ActionType.POSTS.RECEIVED_NEW;
    const isCRTEnabled = await getIsCRTEnabled(operator.database);
    if (isCRTEnabled && post.root_id) {
        actionType = ActionType.POSTS.RECEIVED_IN_THREAD;
    }

    const postModels = await operator.handlePosts({
        actionType,
        order: [post.id],
        posts: [post],
        prepareRecordsOnly: true,
    });
    models.push(...postModels);

    operator.batchRecords(models, 'handlePostEdited');
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
            await operator.batchRecords(models, 'handlePostDeleted');
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
