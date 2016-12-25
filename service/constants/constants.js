// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const Constants = {
    POST_CHUNK_SIZE: 60,
    PROFILE_CHUNK_SIZE: 100,
    CHANNELS_CHUNK_SIZE: 50,

    OFFLINE: 'offline',
    AWAY: 'away',
    ONLINE: 'online',

    TEAM_USER_ROLE: 'team_user',
    TEAM_ADMIN_ROLE: 'team_admin',

    CHANNEL_USER_ROLE: 'channel_user',
    CHANNEL_ADMIN_ROLE: 'channel_admin',

    DEFAULT_CHANNEL: 'town-square',
    DM_CHANNEL: 'D',
    OPEN_CHANNEL: 'O',
    PRIVATE_CHANNEL: 'P',

    POST_DELETED: 'DELETED',
    SYSTEM_MESSAGE_PREFIX: 'system_',

    CATEGORY_DIRECT_CHANNEL_SHOW: 'direct_channel_show',
    CATEGORY_DISPLAY_SETTINGS: 'display_settings',
    CATEGORY_FAVORITE_CHANNEL: 'favorite_channel',
    DISPLAY_PREFER_NICKNAME: 'nickname_full_name',
    DISPLAY_PREFER_FULL_NAME: 'full_name'
};

export default Constants;
