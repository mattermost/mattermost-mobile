// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const MM_TABLES = {
    APP: {
        INFO: 'Info',
        GLOBAL: 'Global',
        SERVERS: 'Servers',
    },
    SERVER: {
        CATEGORY: 'Category',
        CATEGORY_CHANNEL: 'CategoryChannel',
        CHANNEL: 'Channel',
        CHANNEL_INFO: 'ChannelInfo',
        CHANNEL_MEMBERSHIP: 'ChannelMembership',
        CONFIG: 'Config',
        CUSTOM_EMOJI: 'CustomEmoji',
        DRAFT: 'Draft',
        FILE: 'File',
        GROUP: 'Group',
        GROUP_CHANNEL: 'GroupChannel',
        GROUP_MEMBERSHIP: 'GroupMembership',
        GROUP_TEAM: 'GroupTeam',
        MY_CHANNEL: 'MyChannel',
        MY_CHANNEL_SETTINGS: 'MyChannelSettings',
        MY_TEAM: 'MyTeam',
        POST: 'Post',
        POSTS_IN_CHANNEL: 'PostsInChannel',
        POSTS_IN_THREAD: 'PostsInThread',
        PREFERENCE: 'Preference',
        REACTION: 'Reaction',
        ROLE: 'Role',
        SYSTEM: 'System',
        TEAM: 'Team',
        TEAM_CHANNEL_HISTORY: 'TeamChannelHistory',
        TEAM_MEMBERSHIP: 'TeamMembership',
        TEAM_SEARCH_HISTORY: 'TeamSearchHistory',
        THREAD: 'Thread',
        THREADS_IN_TEAM: 'ThreadsInTeam',
        THREAD_PARTICIPANT: 'ThreadParticipant',
        TEAM_THREADS_SYNC: 'TeamThreadsSync',
        USER: 'User',
    },
};

export const MIGRATION_EVENTS = keyMirror({
    MIGRATION_ERROR: null,
    MIGRATION_STARTED: null,
    MIGRATION_SUCCESS: null,
});

export const SYSTEM_IDENTIFIERS = {
    CURRENT_CHANNEL_ID: 'currentChannelId',
    LAST_UNREAD_CHANNEL_ID: 'lastUnreadChannelId',
    CURRENT_TEAM_ID: 'currentTeamId',
    CURRENT_USER_ID: 'currentUserId',
    DATA_RETENTION_POLICIES: 'dataRetentionPolicies',
    EXPANDED_LINKS: 'expandedLinks',
    GRANULAR_DATA_RETENTION_POLICIES: 'granularDataRetentionPolicies',
    LAST_DATA_RETENTION_RUN: 'lastDataRetentionRun',
    GLOBAL_THREADS_TAB: 'globalThreadsTab',
    LAST_DISMISSED_BANNER: 'lastDismissedBanner',
    LAST_SERVER_VERSION_CHECK: 'LastServerVersionCheck',
    LICENSE: 'license',
    ONLY_UNREADS: 'onlyUnreads',
    PUSH_VERIFICATION_STATUS: 'pushVerificationStatus',
    RECENT_CUSTOM_STATUS: 'recentCustomStatus',
    RECENT_MENTIONS: 'recentMentions',
    RECENT_REACTIONS: 'recentReactions',
    SESSION_EXPIRATION: 'sessionExpiration',
    TEAM_HISTORY: 'teamHistory',
    WEBSOCKET: 'WebSocket',
};

export const GLOBAL_IDENTIFIERS = {
    DEVICE_TOKEN: 'deviceToken',
    DONT_ASK_FOR_REVIEW: 'dontAskForReview',
    FIRST_LAUNCH: 'firstLaunch',
    LAST_ASK_FOR_REVIEW: 'lastAskForReview',
    ONBOARDING: 'onboarding',
    LAST_VIEWED_CHANNEL: 'lastViewedChannel',
    LAST_VIEWED_THREAD: 'lastViewedThread',
    PUSH_DISABLED_ACK: 'pushDisabledAck',
};

export enum OperationType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
  }

// The only two types of databases in the app
export enum DatabaseType {
    DEFAULT,
    SERVER,
  }

export default {
    GLOBAL_IDENTIFIERS,
    MM_TABLES,
    MIGRATION_EVENTS,
    SYSTEM_IDENTIFIERS,
};
