// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Config from 'assets/config.json';

const state = {
    entities: {
        general: {
            appState: false,
            credentials: {},
            config: {},
            dataRetentionPolicy: {},
            deviceToken: '',
            license: {},
            serverVersion: '',
        },
        users: {
            currentUserId: '',
            mySessions: [],
            myAudits: [],
            profiles: {},
            profilesInTeam: {},
            profilesInChannel: {},
            profilesNotInChannel: {},
            statuses: {},
        },
        teams: {
            currentTeamId: '',
            teams: {},
            myMembers: {},
            membersInTeam: {},
            stats: {},
        },
        channels: {
            currentChannelId: '',
            channels: {},
            myMembers: {},
            stats: {},
        },
        posts: {
            posts: {},
            postsInChannel: {},
            postsInThread: {},
            selectedPostId: '',
            currentFocusedPostId: '',
        },
        preferences: {
            myPreferences: {},
        },
        search: {
            recent: [],
        },
        typing: {},
    },
    errors: [],
    requests: {
        channels: {
            getChannels: {
                status: 'not_started',
                error: null,
            },
            createChannel: {
                status: 'not_started',
                error: null,
            },
            updateChannel: {
                status: 'not_started',
                error: null,
            },
            myChannels: {
                status: 'not_started',
                error: null,
            },
        },
        general: {
            server: {
                status: 'not_started',
                error: null,
            },
            config: {
                status: 'not_started',
                error: null,
            },
            dataRetentionPolicy: {
                status: 'not_started',
                error: null,
            },
            license: {
                status: 'not_started',
                error: null,
            },
            websocket: {
                status: 'not_started',
                error: null,
            },
        },
        posts: {
            createPost: {
                status: 'not_started',
                error: null,
            },
            editPost: {
                status: 'not_started',
                error: null,
            },
            getPostThread: {
                status: 'not_started',
                error: null,
            },
        },
        teams: {
            getMyTeams: {
                status: 'not_started',
                error: null,
            },
            getTeams: {
                status: 'not_started',
                error: null,
            },
            joinTeam: {
                status: 'not_started',
                error: null,
            },
        },
        users: {
            login: {
                status: 'not_started',
                error: null,
            },
            logout: {
                status: 'not_started',
                error: null,
            },
            autocompleteUsers: {
                status: 'not_started',
                error: null,
            },
            updateMe: {
                status: 'not_started',
                error: null,
            },
        },
        preferences: {
            getMyPreferences: {
                status: 'not_started',
                error: null,
            },
            savePreferences: {
                status: 'not_started',
                error: null,
            },
            deletePreferences: {
                status: 'not_started',
                error: null,
            },
        },
    },
    device: {
        connection: true,
    },
    navigation: '',
    views: {
        channel: {
            drafts: {},
        },
        i18n: {
            locale: '',
        },
        login: {
            loginId: '',
            password: '',
        },
        root: {
            deepLinkURL: '',
            hydrationComplete: false,
            purge: false,
        },
        selectServer: {
            serverUrl: Config.DefaultServerUrl,
        },
        team: {
            lastTeamId: '',
        },
        thread: {
            drafts: {},
        },
    },
};

export default state;
