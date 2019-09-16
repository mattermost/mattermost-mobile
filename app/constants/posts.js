// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const PostTypes = {
    CHANNEL_DELETED: 'system_channel_deleted',
    DISPLAYNAME_CHANGE: 'system_displayname_change',
    CONVERT_CHANNEL: 'system_convert_channel',
    EPHEMERAL: 'system_ephemeral',
    EPHEMERAL_ADD_TO_CHANNEL: 'system_ephemeral_add_to_channel',
    HEADER_CHANGE: 'system_header_change',
    PURPOSE_CHANGE: 'system_purpose_change',

    JOIN_LEAVE: 'system_join_leave',
    JOIN_CHANNEL: 'system_join_channel',
    LEAVE_CHANNEL: 'system_leave_channel',
    ADD_REMOVE: 'system_add_remove',
    ADD_TO_CHANNEL: 'system_add_to_channel',
    REMOVE_FROM_CHANNEL: 'system_remove_from_channel',

    JOIN_TEAM: 'system_join_team',
    LEAVE_TEAM: 'system_leave_team',
    ADD_TO_TEAM: 'system_add_to_team',
    REMOVE_FROM_TEAM: 'system_remove_from_team',

    COMBINED_USER_ACTIVITY: 'system_combined_user_activity',
    ME: 'me',
    ADD_BOT_TEAMS_CHANNELS: 'add_bot_teams_channels',
};

const PostListTypes = {
    COMBINED_USER_ACTIVITY: 'user-activity-',
    DATE_LINE: 'date-',
    START_OF_NEW_MESSAGES: 'start-of-new-messages',
};

export default {
    MAX_COMBINED_SYSTEM_POSTS: 100,
    POST_LIST_TYPES: PostListTypes,
    POST_TYPES: PostTypes,
    IGNORE_POST_TYPES: [
        PostTypes.ADD_REMOVE,
        PostTypes.ADD_TO_CHANNEL,
        PostTypes.CHANNEL_DELETED,
        PostTypes.JOIN_LEAVE,
        PostTypes.JOIN_CHANNEL,
        PostTypes.LEAVE_CHANNEL,
        PostTypes.REMOVE_FROM_CHANNEL,
        PostTypes.JOIN_TEAM,
        PostTypes.LEAVE_TEAM,
        PostTypes.ADD_TO_TEAM,
        PostTypes.REMOVE_FROM_TEAM,
    ],
    USER_ACTIVITY_POST_TYPES: [
        PostTypes.ADD_TO_CHANNEL,
        PostTypes.JOIN_CHANNEL,
        PostTypes.LEAVE_CHANNEL,
        PostTypes.REMOVE_FROM_CHANNEL,
        PostTypes.ADD_TO_TEAM,
        PostTypes.JOIN_TEAM,
        PostTypes.LEAVE_TEAM,
        PostTypes.REMOVE_FROM_TEAM,
    ],
};
