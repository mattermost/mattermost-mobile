// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import DeviceInfo from 'react-native-device-info';

import {ViewTypes} from 'app/constants';
import Config from 'assets/config';

export function messageRetention() {
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
            return next(cleanupState(action));
        } else if (action.type === ViewTypes.DATA_CLEANUP) {
            const nextAction = cleanupState(action, true);
            return next(nextAction);
        }

        return next(action);
    };
}

function resetStateForNewVersion(action) {
    const {payload} = action;
    const lastChannelForTeam = getLastChannelForTeam(payload);
    let users = {};

    if (payload.entities.users) {
        const currentUserId = payload.entities.users.currentUserId;
        if (currentUserId) {
            users = {
                currentUserId,
                profiles: {
                    [currentUserId]: payload.entities.users.profiles[currentUserId]
                }
            };
        }
    }

    const nextState = {
        app: {
            build: DeviceInfo.getBuildNumber(),
            version: DeviceInfo.getVersion()
        },
        entities: {
            general: payload.entities.general,
            teams: {
                currentTeamId: payload.entities.teams.currentTeamId,
                teams: payload.entities.teams.teams,
                myMembers: payload.entities.teams.myMembers
            },
            users,
            preferences: payload.entities.preferences,
            search: {
                recent: payload.entities.search.recent
            }
        },
        views: {
            channel: {
                drafts: payload.views.channel.drafts
            },
            i18n: payload.views.i18n,
            fetchCache: payload.views.fetchCache,
            team: {
                lastTeamId: payload.views.team.lastTeamId,
                lastChannelForTeam
            },
            thread: {
                drafts: payload.views.thread.drafts
            },
            selectServer: payload.views.selectServer
        }
    };

    return {
        type: action.type,
        payload: nextState,
        error: action.error
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

function cleanupState(action, keepCurrent = false) {
    const {payload: resetPayload} = resetStateForNewVersion(action);
    const {payload} = action;
    const {currentChannelId} = payload.entities.channels;
    const {statuses, ...otherUsers} = payload.entities.users; //eslint-disable-line no-unused-vars

    const {lastChannelForTeam} = resetPayload.views.team;
    const nextEntitites = {
        posts: {
            posts: {},
            postsInChannel: {},
            reactions: {},
            selectedPostId: payload.entities.posts.selectedPostId,
            currentFocusedPostId: payload.entities.posts.currentFocusedPostId
        },
        files: {
            files: {},
            fileIdsByPostId: {}
        }
    };

    const retentionPeriod = Config.EnableMessageRetention ? Config.MessageRetentionPeriod + 1 : 0;
    const postIdsToKeep = Object.values(lastChannelForTeam).reduce((array, channelIds) => {
        const ids = channelIds.reduce((result, id) => {
            // we need to check that the channel id is not already included
            // the reason it can be included is cause at least one of the last channels viewed
            // in a team can be a DM or GM and the id can be duplicate
            if (!nextEntitites.posts.postsInChannel[id] && payload.entities.posts.postsInChannel[id]) {
                let postIds;
                if (keepCurrent && currentChannelId === id) {
                    postIds = payload.entities.posts.postsInChannel[id];
                } else {
                    postIds = payload.entities.posts.postsInChannel[id].slice(0, 60);
                }
                nextEntitites.posts.postsInChannel[id] = postIds;
                return result.concat(postIds);
            }

            return result;
        }, []);
        return array.concat(ids);
    }, []);

    postIdsToKeep.forEach((postId) => {
        const post = payload.entities.posts.posts[postId];

        if (post) {
            const skip = keepCurrent && currentChannelId === post.channel_id;

            if (!skip && retentionPeriod && (Date.now() - post.create_at) / (1000 * 3600 * 24) > retentionPeriod) {
                const postsInChannel = nextEntitites.posts.postsInChannel[post.channel_id] || [];
                const index = postsInChannel.indexOf(postId);
                if (index !== -1) {
                    postsInChannel.splice(index, 1);
                }
                return;
            }

            nextEntitites.posts.posts[postId] = post;

            const reaction = payload.entities.posts.reactions[postId];
            if (reaction) {
                nextEntitites.posts.reactions[postId] = reaction;
            }

            const fileIds = payload.entities.files.fileIdsByPostId[postId];
            if (fileIds) {
                nextEntitites.files.fileIdsByPostId[postId] = fileIds;
                fileIds.forEach((fileId) => {
                    nextEntitites.files.files[fileId] = payload.entities.files.files[fileId];
                });
            }
        } else {
            // If the post is not in the store we need to remove it from the postsInChannel
            const channelIds = Object.keys(nextEntitites.posts.postsInChannel);
            for (let i = 0; i < channelIds.length; i++) {
                const channelId = channelIds[i];
                const posts = nextEntitites.posts.postsInChannel[channelId];
                const index = posts.indexOf(postId);
                if (index !== -1) {
                    posts.splice(index, 1);
                    break;
                }
            }
        }
    });

    const nextState = {
        app: resetPayload.app,
        entities: {
            ...nextEntitites,
            channels: payload.entities.channels,
            emojis: payload.entities.emojis,
            general: resetPayload.entities.general,
            preferences: resetPayload.entities.preferences,
            search: resetPayload.entities.search,
            teams: resetPayload.entities.teams,
            users: {
                ...otherUsers
            }
        },
        views: {
            ...resetPayload.views,
            channel: {
                ...resetPayload.views.channel,

                // on data cleanup we need to keep the postVisibility
                postVisibility: payload.views.channel.postVisibility
            }
        }
    };

    if (keepCurrent) {
        nextState.errors = payload.errors;

        // keep the statuses for users in the current channel
        const profileIdsInCurrentChannel = payload.entities.users.profilesInChannel[currentChannelId];
        const nextStatuses = {};
        for (const id of profileIdsInCurrentChannel) {
            nextStatuses[id] = statuses[id];
        }
        nextState.entities.users.statuses = nextStatuses;
    }

    return {
        type: 'persist/REHYDRATE',
        payload: nextState,
        error: action.error
    };
}
