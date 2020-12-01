// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const MM_TABLES = {
    DEFAULT: {
        APP: 'app',
        GLOBAL: 'global',
        SERVERS: 'servers',
    },
    SERVER: {
        CHANNEL: 'Channel',
        CHANNEL_INFO: 'ChannelInfo',
        CHANNEL_MEMBERSHIP: 'ChannelMembership',
        CUSTOM_EMOJI: 'CustomEmoji',
        DRAFT: 'Draft',
        FILE: 'File',
        GROUP: 'Group',
        GROUPS_IN_CHANNEL: 'GroupsInChannel',
        GROUPS_IN_TEAM: 'GroupsInTeam',
        GROUP_MEMBERSHIP: 'GroupMembership',
        MY_CHANNEL: 'MyChannel',
        MY_CHANNEL_SETTINGS: 'MyChannelSettings',
        MY_TEAM: 'MyTeam',
        POST: 'Post',
        POSTS_IN_CHANNEL: 'PostsInChannel',
        POSTS_IN_THREAD: 'PostsInThread',
        POST_METADATA: 'PostMetadata',
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

export const DB_NAME = keyMirror({
    DEFAULT_DATABASE: null,
    SERVER_DATABASE: null,
});

export default {
    DB_NAME,
    MM_TABLES,
};
