// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default {
    REALM_SCHEMA_ID: 'general',
    REALM_EMPTY_OBJECT: {addListener: () => true, removeListener: () => true},

    DEFAULT_CHANNEL: 'town-square',
    DM_CHANNEL: 'D',
    OPEN_CHANNEL: 'O',
    PRIVATE_CHANNEL: 'P',
    GM_CHANNEL: 'G',

    POST_CHUNK_SIZE: 60,
    TEAMS_CHUNK_SIZE: 50,
    PROFILE_CHUNK_SIZE: 100,

    SPECIAL_MENTIONS: [
        'all',
        'channel',
        'here',
    ],

    DEFAULT_LOCALE: 'en',

    DISABLED: 'disabled',
    DEFAULT_ON: 'default_on',
    DEFAULT_OFF: 'default_off',

    MENTION: 'mention',

    RESTRICT_DIRECT_MESSAGE_ANY: 'any',
    RESTRICT_DIRECT_MESSAGE_TEAM: 'team',

    IGNORE_CHANNEL_MENTIONS_ON: 'on',
    IGNORE_CHANNEL_MENTIONS_OFF: 'off',
    IGNORE_CHANNEL_MENTIONS_DEFAULT: 'default',

    OUT_OF_OFFICE: 'ooo',
    OFFLINE: 'offline',
    AWAY: 'away',
    ONLINE: 'online',
    DND: 'dnd',
};
