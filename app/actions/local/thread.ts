// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateThreadRead} from '@actions/remote/thread';
import {ActionType, General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getTranslations, t} from '@i18n';
import {queryChannelById} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {getIsCRTEnabled, getThreadById, queryThreadsInTeam} from '@queries/servers/thread';
import {queryCurrentUser} from '@queries/servers/user';
import {goToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {changeOpacity} from '@utils/theme';

import type Model from '@nozbe/watermelondb/Model';

export const switchToThread = async (serverUrl: string, rootId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const user = await queryCurrentUser(database);
        if (!user) {
            return {error: 'User not found'};
        }

        const post = await queryPostById(database, rootId);
        if (!post) {
            return {error: 'Post not found'};
        }
        const channel = await queryChannelById(database, post.channelId);
        if (!channel) {
            return {error: 'Channel not found'};
        }

        const theme = EphemeralStore.theme;
        if (!theme) {
            return {error: 'Theme not found'};
        }

        // Modal right buttons
        const rightButtons = [];

        const isCRTEnabled = await getIsCRTEnabled(database);
        if (isCRTEnabled) {
            const thread = await post.thread.fetch();
            if (!thread) {
                return {error: 'Thread not found'};
            }

            // CRT: Mark thread as read if we have unreads
            if (thread.unreadReplies || thread.unreadMentions) {
                updateThreadRead(serverUrl, channel.teamId, thread.id, Date.now());
            }

            // CRT: Add follow/following button
            rightButtons.push({
                id: 'thread-follow-button',
                component: {
                    id: thread.id,
                    name: 'ThreadFollow',
                    passProps: {
                        teamId: channel.teamId,
                        threadId: thread.id,
                    },
                },
            });
        }

        // Get translation by user locale
        const translations = getTranslations(user.locale);

        // Get title translation or default title message
        let title = translations[t('thread.header.thread')] || 'Thread';
        if (channel.type === General.DM_CHANNEL) {
            title = translations[t('thread.header.thread_dm')] || 'Direct Message Thread';
        }

        let subtitle = '';
        if (channel?.type !== General.DM_CHANNEL) {
            // Get translation or default message
            subtitle = translations[t('thread.header.thread_in')] || 'in {channelName}';
            subtitle = subtitle.replace('{channelName}', channel.displayName);
        }

        goToScreen(Screens.THREAD, '', {rootId}, {
            topBar: {
                title: {
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
                rightButtons,
            },
        });
        return {};
    } catch (error) {
        return {error};
    }
};

// When new post arrives:
// 1. If a reply, then update the reply_count, add user as the participant
// 2. Else add the post as a thread
export const processThreadFromNewPost = async (serverUrl: string, post: Post, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];
    if (post.root_id) {
        // Update the thread data: `reply_count`
        const {model: threadModel} = await processUpdateThreadReplyCount(serverUrl, post.root_id, post.reply_count, true);
        if (threadModel) {
            models.push(threadModel);
        }

        // Add current user as a participant to the thread
        const threadParticipantModels = await operator.handleAddThreadParticipants({
            threadId: post.root_id,
            participants: [post.user_id],
            prepareRecordsOnly: true,
        });
        if (threadParticipantModels?.length) {
            models.push(...threadParticipantModels);
        }
    } else { // If the post is a root post, then we need to add it to the thread table
        const {models: threadModels} = await processThreadsFromReceivedPosts(serverUrl, [post], true);
        if (threadModels?.length) {
            models.push(...threadModels);
        }
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
};

// On receiving "posts", Save the "root posts" as "threads"
export const processThreadsFromReceivedPosts = async (serverUrl: string, posts: Post[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];

    const threads: Thread[] = [];
    posts.forEach((post: Post) => {
        if (!post.root_id && post.type === '') {
            threads.push({
                id: post.id,
                participants: post.participants,
                reply_count: post.reply_count,
                last_reply_at: post.last_reply_at,
                is_following: post.is_following,
            } as Thread);
        }
    });
    if (threads.length) {
        const threadModels = await operator.handleThreads({threads, prepareRecordsOnly: true});
        if (threadModels.length) {
            models.push(...threadModels);
        }
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
};

// On receiving threads, Along with the "threads" & "thread participants", extract and save "posts" & "users"
export const processReceivedThreads = async (serverUrl: string, threads: Thread[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];

    const posts: Post[] = [];
    const users: UserProfile[] = [];

    // Extract posts & users from the received threads
    for (let i = 0; i < threads.length; i++) {
        const {participants, post} = threads[i];
        posts.push(post);
        participants.forEach((participant) => users.push(participant));
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
        order: [],
        posts,
        prepareRecordsOnly: true,
    });

    if (postModels.length) {
        models.push(...postModels);
    }

    const threadModels = await operator.handleThreads({
        threads,
        prepareRecordsOnly: true,
    });

    if (threadModels.length) {
        models.push(...threadModels);
    }

    const userModels = await operator.handleUsers({
        users,
        prepareRecordsOnly: true,
    });

    if (userModels.length) {
        models.push(...userModels);
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }
    return {models};
};

export const processUpdateTeamThreadsAsRead = async (serverUrl: string, teamId: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const {database} = operator;
        const threads = await queryThreadsInTeam({database, teamId, onlyUnreads: true}).fetch();
        const models = threads.map((thread) => thread.prepareUpdate((record) => {
            record.unreadMentions = 0;
            record.unreadReplies = 0;
            record.lastViewedAt = new Date().getTime();
        }));
        if (!prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadFollow = async (serverUrl: string, threadId: string, state: boolean, replyCount?: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await getThreadById(database, threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.replyCount = replyCount ?? record.replyCount;
                record.isFollowing = state;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadRead = async (serverUrl: string, threadId: string, lastViewedAt: number, unreadMentions?: number, unreadReplies?: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await getThreadById(database, threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.lastViewedAt = lastViewedAt;
                record.unreadMentions = unreadMentions ?? record.unreadMentions;
                record.unreadReplies = unreadReplies ?? record.unreadReplies;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadReplyCount = async (serverUrl: string, threadId: string, replyCount: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await getThreadById(database, threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.replyCount = replyCount;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};
