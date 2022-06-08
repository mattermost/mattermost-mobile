// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {ActionType, General, Navigation, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getTranslations, t} from '@i18n';
import {getChannelById} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getCurrentTeamId, getCurrentUserId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory} from '@queries/servers/team';
import {getIsCRTEnabled, getThreadById, prepareThreadsFromReceivedPosts, queryThreadsInTeam} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {goToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {changeOpacity} from '@utils/theme';

import type Model from '@nozbe/watermelondb/Model';

export const switchToGlobalThreads = async (serverUrl: string, teamId?: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    const models: Model[] = [];

    let teamIdToUse = teamId;
    if (!teamId) {
        teamIdToUse = await getCurrentTeamId(database);
    }

    if (!teamIdToUse) {
        return {error: 'no team to switch to'};
    }

    try {
        await setCurrentTeamAndChannelId(operator, teamIdToUse, '');
        const history = await addChannelToTeamHistory(operator, teamIdToUse, Screens.GLOBAL_THREADS, true);
        models.push(...history);

        if (!prepareRecordsOnly) {
            await operator.batchRecords(models);
        }

        const isTabletDevice = await isTablet();
        if (isTabletDevice) {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_HOME, Screens.GLOBAL_THREADS);
        } else {
            goToScreen(Screens.GLOBAL_THREADS, '', {}, {topBar: {visible: false}});
        }
    } catch (error) {
        return {error};
    }

    return {models};
};

export const switchToThread = async (serverUrl: string, rootId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const user = await getCurrentUser(database);
        if (!user) {
            return {error: 'User not found'};
        }

        const post = await getPostById(database, rootId);
        if (!post) {
            return {error: 'Post not found'};
        }
        const channel = await getChannelById(database, post.channelId);
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
            // CRT: Add follow/following button
            rightButtons.push({
                id: 'thread-follow-button',
                component: {
                    id: post.id,
                    name: Screens.THREAD_FOLLOW_BUTTON,
                    passProps: {
                        teamId: channel.teamId,
                        threadId: post.id,
                    },
                },
            });
        }

        // Get translation by user locale
        const translations = getTranslations(user.locale);

        // Get title translation or default title message
        const title = translations[t('thread.header.thread')] || 'Thread';

        let subtitle = '';
        if (channel?.type === General.DM_CHANNEL) {
            subtitle = channel.displayName;
        } else {
            // Get translation or default message
            subtitle = translations[t('thread.header.thread_in')] || 'in {channelName}';
            subtitle = subtitle.replace('{channelName}', channel.displayName);
        }

        EphemeralStore.setLastViewedThreadId(rootId);
        goToScreen(Screens.THREAD, '', {rootId}, {
            topBar: {
                title: {
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
                noBorder: true,
                scrollEdgeAppearance: {
                    noBorder: true,
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
export async function createThreadFromNewPost(serverUrl: string, post: Post, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];
    if (post.root_id) {
        // Update the thread data: `reply_count`
        const {model: threadModel} = await updateThread(serverUrl, post.root_id, {reply_count: post.reply_count}, true);
        if (threadModel) {
            models.push(threadModel);
        }

        // Add user as a participant to the thread
        const threadParticipantModels = await operator.handleThreadParticipants({
            threadsParticipants: [{
                thread_id: post.root_id,
                participants: [{
                    thread_id: post.root_id,
                    id: post.user_id,
                }],
            }],
            prepareRecordsOnly: true,
            skipSync: true,
        });
        models.push(...threadParticipantModels);
    } else { // If the post is a root post, then we need to add it to the thread table
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [post]);
        models.push(...threadModels);
    }

    if (!prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
}

// On receiving threads, Along with the "threads" & "thread participants", extract and save "posts" & "users"
export async function processReceivedThreads(serverUrl: string, threads: Thread[], teamId: string, loadedInGlobalThreads = false, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    const currentUserId = await getCurrentUserId(database);

    const posts: Post[] = [];
    const users: UserProfile[] = [];

    // Extract posts & users from the received threads
    for (let i = 0; i < threads.length; i++) {
        const {participants, post} = threads[i];
        posts.push(post);
        participants.forEach((participant) => {
            if (currentUserId !== participant.id) {
                users.push(participant);
            }
        });
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
        order: [],
        posts,
        prepareRecordsOnly: true,
    });

    const threadModels = await operator.handleThreads({
        threads,
        teamId,
        prepareRecordsOnly: true,
        loadedInGlobalThreads,
    });

    const models = [...postModels, ...threadModels];

    if (users.length) {
        const userModels = await operator.handleUsers({
            users,
            prepareRecordsOnly: true,
        });
        models.push(...userModels);
    }

    if (!prepareRecordsOnly) {
        await operator.batchRecords(models);
    }
    return {models};
}

export async function markTeamThreadsAsRead(serverUrl: string, teamId: string, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const {database} = operator;
        const threads = await queryThreadsInTeam(database, teamId, true, true, true).fetch();
        const models = threads.map((thread) => thread.prepareUpdate((record) => {
            record.unreadMentions = 0;
            record.unreadReplies = 0;
            record.lastViewedAt = Date.now();
        }));
        if (!prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
}

export async function updateThread(serverUrl: string, threadId: string, updatedThread: Partial<Thread>, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await getThreadById(database, threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.isFollowing = updatedThread.is_following ?? record.isFollowing;
                record.replyCount = updatedThread.reply_count ?? record.replyCount;

                record.lastViewedAt = updatedThread.last_viewed_at ?? record.lastViewedAt;
                record.unreadMentions = updatedThread.unread_mentions ?? record.unreadMentions;
                record.unreadReplies = updatedThread.unread_replies ?? record.unreadReplies;
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
}
