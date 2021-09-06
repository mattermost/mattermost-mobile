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
        CHANNEL: 'Channel',
        CHANNEL_INFO: 'ChannelInfo',
        CHANNEL_MEMBERSHIP: 'ChannelMembership',
        CUSTOM_EMOJI: 'CustomEmoji',
        DRAFT: 'Draft',
        FILE: 'File',
        GROUP: 'Group',
        GROUPS_CHANNEL: 'GroupsChannel',
        GROUPS_TEAM: 'GroupsTeam',
        GROUP_MEMBERSHIP: 'GroupMembership',
        MY_CHANNEL: 'MyChannel',
        MY_CHANNEL_SETTINGS: 'MyChannelSettings',
        MY_TEAM: 'MyTeam',
        POST: 'Post',
        POSTS_IN_CHANNEL: 'PostsInChannel',
        POSTS_IN_THREAD: 'PostsInThread',
        PREFERENCE: 'Preference',
        REACTION: 'Reaction',
        ROLE: 'Role',
        SLASH_COMMAND: 'SlashCommand',
        SYSTEM: 'System',
        TEAM: 'Team',
        TEAM_CHANNEL_HISTORY: 'TeamChannelHistory',
        TEAM_MEMBERSHIP: 'TeamMembership',
        TEAM_SEARCH_HISTORY: 'TeamSearchHistory',
        TERMS_OF_SERVICE: 'TermsOfService',
        USER: 'User',
    },
};

export const MIGRATION_EVENTS = keyMirror({
    MIGRATION_ERROR: null,
    MIGRATION_STARTED: null,
    MIGRATION_SUCCESS: null,
});

export const SYSTEM_IDENTIFIERS = {
    CONFIG: 'config',
    CURRENT_CHANNEL_ID: 'currentChannelId',
    CURRENT_TEAM_ID: 'currentTeamId',
    CURRENT_USER_ID: 'currentUserId',
    DATA_RETENTION_POLICIES: 'dataRetentionPolicies',
    EXPANDED_LINKS: 'expandedLinks',
    RECENT_REACTIONS: 'recentReactions',
    INTEGRATION_TRIGGER_ID: 'IntegreationTriggerId',
    LICENSE: 'license',
    WEBSOCKET: 'WebSocket',
};

export const GLOBAL_IDENTIFIERS = {
    DEVICE_TOKEN: 'deviceToken',
    MENTION_COUNT: 'mentionCount',
};

export default {
    GLOBAL_IDENTIFIERS,
    MM_TABLES,
    MIGRATION_EVENTS,
    SYSTEM_IDENTIFIERS,
};
