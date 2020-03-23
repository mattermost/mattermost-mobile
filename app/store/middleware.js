// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {ViewTypes} from 'app/constants';
import initialState from 'app/initial_state';
import {throttle} from 'app/utils/general';

import mattermostBucket from 'app/mattermost_bucket';

import {
    captureException,
    LOGGER_JAVASCRIPT_WARNING,
} from 'app/utils/sentry';

const SAVE_STATE_ACTIONS = [
    'CONNECTION_CHANGED',
    'DATA_CLEANUP',
    'LOGIN',
    'Offline/STATUS_CHANGED',
    'persist/REHYDRATE',
    'RECEIVED_APP_STATE',
    'WEBSOCKET_CLOSED',
    'WEBSOCKET_SUCCESS',
];

// This middleware stores key parts of state entities into a file (in the App Group container) on certain actions.
// iOS only. Allows the share extension to work, without having access available to the redux store object.
// Remove this middleware if/when state is moved to a persisted solution.
const saveShareExtensionState = (store) => {
    return (next) => (action) => {
        if (SAVE_STATE_ACTIONS.includes(action.type)) {
            throttle(saveStateToFile(store));
        }
        return next(action);
    };
};

const saveStateToFile = async (store) => {
    if (Platform.OS === 'ios') {
        const state = store.getState();
        if (state.entities) {
            const channelsInTeam = {...state.entities.channels.channelsInTeam};
            Object.keys(channelsInTeam).forEach((teamId) => {
                channelsInTeam[teamId] = Array.from(channelsInTeam[teamId]);
            });

            const profilesInChannel = {...state.entities.users.profilesInChannel};
            Object.keys(profilesInChannel).forEach((channelId) => {
                profilesInChannel[channelId] = Array.from(profilesInChannel[channelId]);
            });

            let url;
            if (state.entities.users.currentUserId) {
                url = state.entities.general.credentials.url || state.views.selectServer.serverUrl;
            }

            const entities = {
                ...state.entities,
                general: {
                    ...state.entities.general,
                    credentials: {
                        url,
                    },
                },
                channels: {
                    ...state.entities.channels,
                    channelsInTeam,
                },
                users: {
                    ...state.entities.users,
                    profilesInChannel,
                    profilesNotInTeam: [],
                    profilesWithoutTeam: [],
                    profilesNotInChannel: [],
                },
            };

            mattermostBucket.writeToFile('entities', JSON.stringify(entities));
        }
    }
};

const messageRetention = (store) => {
    return (next) => (action) => {
        if (action.type === 'persist/REHYDRATE') {
            const {app} = action.payload;
            const {entities, views} = action.payload;

            if (!entities || !views) {
                return next(action);
            }

            // When a new version of the app has been detected
            if (!app || !app.version || app.version !== DeviceInfo.getVersion() || app.build !== DeviceInfo.getBuildNumber()) {
                return next(resetStateForNewVersion(action));
            }

            // Keep only the last 60 messages for the last 5 viewed channels in each team
            // and apply data retention on those posts if applies
            let nextAction;
            try {
                nextAction = cleanUpState(action);
            } catch (e) {
                // Sometimes, the payload is incomplete so log the error to Sentry and skip the cleanup
                console.warn(e); // eslint-disable-line no-console
                captureException(e, LOGGER_JAVASCRIPT_WARNING, store);
                nextAction = action;
            }

            return next(nextAction);
        } else if (action.type === ViewTypes.DATA_CLEANUP) {
            const nextAction = cleanUpState(action, true);
            return next(nextAction);
        }

        /* Uncomment the following lines to log the actions being dispatched */
        // if (action.type === 'BATCHING_REDUCER.BATCH') {
        //     action.payload.forEach((p) => {
        //         console.log('BATCHED ACTIONS', p.type);
        //     });
        // } else {
        //     console.log('ACTION', action.type);
        // }

        return next(action);
    };
};

function resetStateForNewVersion(action) {
    const {payload} = action;
    const lastChannelForTeam = getLastChannelForTeam(payload);

    let general = initialState.entities.general;
    if (payload.entities.general) {
        general = payload.entities.general;
    }

    let teams = initialState.entities.teams;
    if (payload.entities.teams) {
        teams = {
            currentTeamId: payload.entities.teams.currentTeamId,
            teams: payload.entities.teams.teams,
            myMembers: payload.entities.teams.myMembers,
        };
    }

    let users = initialState.entities.users;
    if (payload.entities.users) {
        const currentUserId = payload.entities.users.currentUserId;
        if (currentUserId) {
            users = {
                currentUserId,
                profiles: {
                    [currentUserId]: payload.entities.users.profiles[currentUserId],
                },
            };
        }
    }

    let preferences = initialState.entities.preferences;
    if (payload.entities.preferences) {
        preferences = payload.entities.preferences;
    }

    let roles = initialState.entities.roles;
    if (payload.entities.roles) {
        roles = payload.entities.roles;
    }

    let search = initialState.entities.search;
    if (payload.entities.search && payload.entities.search.recent) {
        search = {
            recent: payload.entities.search.recent,
        };
    }

    let channelDrafts = initialState.views.channel.drafts;
    if (payload.views.channel && payload.views.channel.drafts) {
        channelDrafts = payload.views.channel.drafts;
    }

    let i18n = initialState.views.i18n;
    if (payload.views.i18n) {
        i18n = payload.views.i18n;
    }

    let lastTeamId = initialState.views.team.lastTeamId;
    if (payload.views.team && payload.views.team.lastTeamId) {
        lastTeamId = payload.views.team.lastTeamId;
    }

    const currentChannelId = lastChannelForTeam[lastTeamId] && lastChannelForTeam[lastTeamId].length ? lastChannelForTeam[lastTeamId][0] : '';
    let channels = initialState.entities.channels;
    if (payload.entities.channels && currentChannelId) {
        channels = {
            currentChannelId,
            channels: {
                [currentChannelId]: payload.entities.channels.channels[currentChannelId],
            },
            myMembers: {
                [currentChannelId]: payload.entities.channels.myMembers[currentChannelId],
            },
        };
    }

    let threadDrafts = initialState.views.thread.drafts;
    if (payload.views.thread && payload.views.thread.drafts) {
        threadDrafts = payload.views.thread.drafts;
    }

    let selectServer = initialState.views.selectServer;
    if (payload.views.selectServer) {
        selectServer = payload.views.selectServer;
    }

    let recentEmojis = initialState.views.recentEmojis;
    if (payload.views.recentEmojis) {
        recentEmojis = payload.views.recentEmojis;
    }

    const nextState = {
        app: {
            build: DeviceInfo.getBuildNumber(),
            version: DeviceInfo.getVersion(),
        },
        entities: {
            channels,
            general,
            teams,
            users,
            preferences,
            search,
            roles,
        },
        views: {
            channel: {
                drafts: channelDrafts,
            },
            i18n,
            team: {
                lastTeamId,
                lastChannelForTeam,
            },
            thread: {
                drafts: threadDrafts,
            },
            root: {
                hydrationComplete: true,
            },
            selectServer,
            recentEmojis,
        },
        websocket: {
            lastConnectAt: payload.websocket?.lastConnectAt,
            lastDisconnectAt: payload.websocket?.lastDisconnectAt,
        },
    };

    return {
        type: action.type,
        payload: nextState,
        error: action.error,
    };
}

function getLastChannelForTeam(payload) {
    const lastChannelForTeam = {...payload.views.team.lastChannelForTeam};
    const convertLastChannelForTeam = Object.values(lastChannelForTeam).some((value) => !Array.isArray(value));

    if (convertLastChannelForTeam) {
        Object.keys(lastChannelForTeam).forEach((id) => {
            lastChannelForTeam[id] = [lastChannelForTeam[id]];
        });
    }

    return lastChannelForTeam;
}

export function cleanUpState(action, keepCurrent = false) {
    const {payload: resetPayload} = resetStateForNewVersion(action);
    const {payload} = action;
    const {currentChannelId} = payload.entities.channels;

    const {lastChannelForTeam} = resetPayload.views.team;
    const nextEntities = {
        posts: {
            posts: {},
            postsInChannel: {},
            postsInThread: {},
            reactions: {},
            openGraph: payload.entities.posts.openGraph,
            selectedPostId: payload.entities.posts.selectedPostId,
            currentFocusedPostId: payload.entities.posts.currentFocusedPostId,
        },
        files: {
            files: {},
            fileIdsByPostId: {},
        },
    };

    let retentionPeriod = 0;
    if (resetPayload.entities.general && resetPayload.entities.general.dataRetentionPolicy &&
        resetPayload.entities.general.dataRetentionPolicy.message_deletion_enabled) {
        retentionPeriod = resetPayload.entities.general.dataRetentionPolicy.message_retention_cutoff;
    }

    const postIdsToKeep = [];

    // Keep the last 60 posts in each recently viewed channel
    nextEntities.posts.postsInChannel = cleanUpPostsInChannel(payload.entities.posts.postsInChannel, lastChannelForTeam, keepCurrent ? currentChannelId : '');
    postIdsToKeep.push(...getAllFromPostsInChannel(nextEntities.posts.postsInChannel));

    // Keep any posts that appear in search results
    let searchResults = [];
    let flaggedPosts = [];
    if (payload.entities.search) {
        if (payload.entities.search.results?.length) {
            const {results} = payload.entities.search;
            searchResults = results;
            postIdsToKeep.push(...results);
        }

        if (payload.entities.search.flagged?.length) {
            const {flagged} = payload.entities.search;
            flaggedPosts = flagged;
            postIdsToKeep.push(...flagged);
        }
    }

    postIdsToKeep.forEach((postId) => {
        const post = payload.entities.posts.posts[postId];

        if (post) {
            if (retentionPeriod && post.create_at < retentionPeriod) {
                // This post has been removed by data retention, so don't keep it
                removeFromPostsInChannel(nextEntities.posts.postsInChannel, post.channel_id, postId);

                return;
            }

            // Keep the post
            nextEntities.posts.posts[postId] = post;

            // And its reactions
            const reaction = payload.entities.posts.reactions[postId];
            if (reaction) {
                nextEntities.posts.reactions[postId] = reaction;
            }

            // And its files
            const fileIds = payload.entities.files.fileIdsByPostId[postId];
            if (fileIds) {
                nextEntities.files.fileIdsByPostId[postId] = fileIds;
                fileIds.forEach((fileId) => {
                    nextEntities.files.files[fileId] = payload.entities.files.files[fileId];
                });
            }

            // And its comments
            const postsInThread = payload.entities.posts.postsInThread[postId];
            if (postsInThread) {
                nextEntities.posts.postsInThread[postId] = postsInThread;
            }
        }
    });

    // Remove any pending posts that haven't failed
    if (payload.entities.posts && payload.entities.posts.pendingPostIds && payload.entities.posts.pendingPostIds.length) {
        const nextPendingPostIds = [...payload.entities.posts.pendingPostIds];
        payload.entities.posts.pendingPostIds.forEach((id) => {
            const posts = nextEntities.posts.posts;
            const post = posts[id];

            if (post && !post.failed) {
                Reflect.deleteProperty(posts, id);

                removeFromPostsInChannel(nextEntities.posts.postsInChannel, post.channel_id, id);

                removePendingPost(nextPendingPostIds, id);
            } else if (!post) {
                removePendingPost(nextPendingPostIds, id);
            }
        });

        nextEntities.posts.pendingPostIds = nextPendingPostIds;
    }

    const nextState = {
        app: resetPayload.app,
        entities: {
            ...nextEntities,
            channels: payload.entities.channels,
            emojis: payload.entities.emojis,
            general: resetPayload.entities.general,
            preferences: resetPayload.entities.preferences,
            search: {
                ...resetPayload.entities.search,
                results: searchResults,
                flagged: flaggedPosts,
            },
            teams: resetPayload.entities.teams,
            users: payload.entities.users,
            roles: resetPayload.entities.roles,
        },
        views: {
            announcement: payload.views.announcement,
            ...resetPayload.views,
            channel: {
                ...resetPayload.views.channel,
                ...payload.views.channel,
            },
        },
        websocket: {
            lastConnectAt: payload.websocket?.lastConnectAt,
            lastDisconnectAt: payload.websocket?.lastDisconnectAt,
        },
    };

    nextState.errors = payload.errors;

    return {
        type: action.type,
        payload: nextState,
        error: action.error,
    };
}

// cleanUpPostsInChannel returns a copy of postsInChannel where only the most recent posts in each channel are kept
export function cleanUpPostsInChannel(postsInChannel, lastChannelForTeam, currentChannelId, recentPostCount = 60) {
    const nextPostsInChannel = {};

    for (const channelIds of Object.values(lastChannelForTeam)) {
        for (const channelId of channelIds) {
            if (nextPostsInChannel[channelId]) {
                // This is a DM or GM channel that we've already seen on another team
                continue;
            }

            const postsForChannel = postsInChannel[channelId];

            if (!postsForChannel) {
                // We don't have anything to keep for this channel
                continue;
            }

            let nextPostsForChannel;

            if (channelId === currentChannelId) {
                // Keep all of the posts for this channel
                nextPostsForChannel = postsForChannel;
            } else {
                // Only keep the most recent posts for this channel
                const recentBlock = postsForChannel.find((block) => block.recent);

                if (!recentBlock) {
                    // We don't have recent posts for this channel
                    continue;
                }

                nextPostsForChannel = [{
                    ...recentBlock,
                    order: recentBlock.order.slice(0, recentPostCount),
                }];
            }

            nextPostsInChannel[channelId] = nextPostsForChannel;
        }
    }

    return nextPostsInChannel;
}

// getAllFromPostsInChannel returns an array of all post IDs found in postsInChannel
export function getAllFromPostsInChannel(postsInChannel) {
    const postIds = [];

    for (const postsForChannel of Object.values(postsInChannel)) {
        for (const block of postsForChannel) {
            postIds.push(...block.order);
        }
    }

    return postIds;
}

function removeFromPostsInChannel(postsInChannel, channelId, postId) {
    const postsForChannel = postsInChannel[channelId];

    if (!postsForChannel) {
        return;
    }

    // Since this has already gone through cleanUpPostsInChannel, we know that there can only be one block to look at
    const index = postsForChannel[0].order.indexOf(postId);
    if (index !== -1) {
        postsForChannel[0].order.splice(index, 1);
    }
}

function removePendingPost(pendingPostIds, id) {
    const pendingIndex = pendingPostIds.indexOf(id);
    if (pendingIndex !== -1) {
        pendingPostIds.splice(pendingIndex, 1);
    }
}

export const middlewares = [messageRetention];

if (Platform.OS === 'ios') {
    middlewares.push(saveShareExtensionState);
}
