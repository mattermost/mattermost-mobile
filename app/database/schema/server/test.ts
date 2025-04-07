// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {
    CATEGORY,
    CATEGORY_CHANNEL,
    CHANNEL,
    CHANNEL_BOOKMARK,
    CHANNEL_INFO,
    CHANNEL_MEMBERSHIP,
    CONFIG,
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    GROUP,
    GROUP_CHANNEL,
    GROUP_MEMBERSHIP,
    GROUP_TEAM,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
    MY_TEAM,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    PREFERENCE,
    REACTION,
    ROLE,
    SYSTEM,
    TEAM,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
    THREAD,
    THREAD_PARTICIPANT,
    THREADS_IN_TEAM,
    TEAM_THREADS_SYNC,
    USER,
} = MM_TABLES.SERVER;

describe('*** Test schema for SERVER database ***', () => {
    it('=> The SERVER SCHEMA should strictly match', () => {
        expect(serverSchema).toEqual({
            version: 8,
            unsafeSql: undefined,
            tables: {
                [CATEGORY]: {
                    name: CATEGORY,
                    unsafeSql: undefined,
                    columns: {
                        collapsed: {name: 'collapsed', type: 'boolean'},
                        display_name: {name: 'display_name', type: 'string'},
                        muted: {name: 'muted', type: 'boolean'},
                        sort_order: {name: 'sort_order', type: 'number'},
                        sorting: {name: 'sorting', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        type: {name: 'type', type: 'string'},
                    },
                    columnArray: [
                        {name: 'collapsed', type: 'boolean'},
                        {name: 'display_name', type: 'string'},
                        {name: 'muted', type: 'boolean'},
                        {name: 'sort_order', type: 'number'},
                        {name: 'sorting', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'type', type: 'string'},
                    ],
                },
                [CATEGORY_CHANNEL]: {
                    name: CATEGORY_CHANNEL,
                    unsafeSql: undefined,
                    columns: {
                        category_id: {name: 'category_id', type: 'string', isIndexed: true},
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        sort_order: {name: 'sort_order', type: 'number'},
                    },
                    columnArray: [
                        {name: 'category_id', type: 'string', isIndexed: true},
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'sort_order', type: 'number'},
                    ],
                },
                [CHANNEL_INFO]: {
                    name: CHANNEL_INFO,
                    unsafeSql: undefined,
                    columns: {
                        guest_count: {name: 'guest_count', type: 'number'},
                        header: {name: 'header', type: 'string'},
                        member_count: {name: 'member_count', type: 'number'},
                        pinned_post_count: {name: 'pinned_post_count', type: 'number'},
                        files_count: {name: 'files_count', type: 'number'},
                        purpose: {name: 'purpose', type: 'string'},
                    },
                    columnArray: [
                        {name: 'guest_count', type: 'number'},
                        {name: 'header', type: 'string'},
                        {name: 'member_count', type: 'number'},
                        {name: 'pinned_post_count', type: 'number'},
                        {name: 'files_count', type: 'number'},
                        {name: 'purpose', type: 'string'},
                    ],
                },
                [CHANNEL]: {
                    name: CHANNEL,
                    unsafeSql: undefined,
                    columns: {
                        create_at: {name: 'create_at', type: 'number'},
                        creator_id: {name: 'creator_id', type: 'string', isIndexed: true},
                        delete_at: {name: 'delete_at', type: 'number'},
                        display_name: {name: 'display_name', type: 'string'},
                        is_group_constrained: {
                            name: 'is_group_constrained',
                            type: 'boolean',
                        },
                        name: {name: 'name', type: 'string', isIndexed: true},
                        shared: {name: 'shared', type: 'boolean'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        type: {name: 'type', type: 'string'},
                        update_at: {name: 'update_at', type: 'number'},
                        banner_info: {name: 'banner_info', type: 'string', isOptional: true},

                    },
                    columnArray: [
                        {name: 'create_at', type: 'number'},
                        {name: 'creator_id', type: 'string', isIndexed: true},
                        {name: 'delete_at', type: 'number'},
                        {name: 'display_name', type: 'string'},
                        {name: 'is_group_constrained', type: 'boolean'},
                        {name: 'name', type: 'string', isIndexed: true},
                        {name: 'shared', type: 'boolean'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'type', type: 'string'},
                        {name: 'update_at', type: 'number'},
                        {name: 'banner_info', type: 'string', isOptional: true},
                    ],
                },
                [CHANNEL_BOOKMARK]: {
                    name: CHANNEL_BOOKMARK,
                    unsafeSql: undefined,
                    columns: {
                        create_at: {name: 'create_at', type: 'number'},
                        update_at: {name: 'update_at', type: 'number'},
                        delete_at: {name: 'delete_at', type: 'number'},
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        owner_id: {name: 'owner_id', type: 'string'},
                        file_id: {name: 'file_id', type: 'string', isOptional: true},
                        display_name: {name: 'display_name', type: 'string'},
                        sort_order: {name: 'sort_order', type: 'number'},
                        link_url: {name: 'link_url', type: 'string', isOptional: true},
                        image_url: {name: 'image_url', type: 'string', isOptional: true},
                        emoji: {name: 'emoji', type: 'string', isOptional: true},
                        type: {name: 'type', type: 'string'},
                        original_id: {name: 'original_id', type: 'string', isOptional: true},
                        parent_id: {name: 'parent_id', type: 'string', isOptional: true},

                    },
                    columnArray: [
                        {name: 'create_at', type: 'number'},
                        {name: 'update_at', type: 'number'},
                        {name: 'delete_at', type: 'number'},
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'owner_id', type: 'string'},
                        {name: 'file_id', type: 'string', isOptional: true},
                        {name: 'display_name', type: 'string'},
                        {name: 'sort_order', type: 'number'},
                        {name: 'link_url', type: 'string', isOptional: true},
                        {name: 'image_url', type: 'string', isOptional: true},
                        {name: 'emoji', type: 'string', isOptional: true},
                        {name: 'type', type: 'string'},
                        {name: 'original_id', type: 'string', isOptional: true},
                        {name: 'parent_id', type: 'string', isOptional: true},
                    ],
                },
                [CHANNEL_MEMBERSHIP]: {
                    name: CHANNEL_MEMBERSHIP,
                    unsafeSql: undefined,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        scheme_admin: {name: 'scheme_admin', type: 'boolean'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                        {name: 'scheme_admin', type: 'boolean'},
                    ],
                },
                [CONFIG]: {
                    name: CONFIG,
                    unsafeSql: undefined,
                    columns: {
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'value', type: 'string'},
                    ],
                },
                [CUSTOM_EMOJI]: {
                    name: CUSTOM_EMOJI,
                    unsafeSql: undefined,
                    columns: {
                        name: {name: 'name', type: 'string', isIndexed: true},
                    },
                    columnArray: [{name: 'name', type: 'string', isIndexed: true}],
                },
                [MY_CHANNEL]: {
                    name: MY_CHANNEL,
                    unsafeSql: undefined,
                    columns: {
                        is_unread: {name: 'is_unread', type: 'boolean'},
                        last_post_at: {name: 'last_post_at', type: 'number'},
                        last_viewed_at: {name: 'last_viewed_at', type: 'number'},
                        manually_unread: {name: 'manually_unread', type: 'boolean'},
                        mentions_count: {name: 'mentions_count', type: 'number'},
                        message_count: {name: 'message_count', type: 'number'},
                        roles: {name: 'roles', type: 'string'},
                        viewed_at: {name: 'viewed_at', type: 'number'},
                        last_fetched_at: {name: 'last_fetched_at', type: 'number', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'is_unread', type: 'boolean'},
                        {name: 'last_post_at', type: 'number'},
                        {name: 'last_viewed_at', type: 'number'},
                        {name: 'manually_unread', type: 'boolean'},
                        {name: 'mentions_count', type: 'number'},
                        {name: 'message_count', type: 'number'},
                        {name: 'roles', type: 'string'},
                        {name: 'viewed_at', type: 'number'},
                        {name: 'last_fetched_at', type: 'number', isIndexed: true},
                    ],
                },
                [MY_CHANNEL_SETTINGS]: {
                    name: MY_CHANNEL_SETTINGS,
                    unsafeSql: undefined,
                    columns: {
                        notify_props: {name: 'notify_props', type: 'string'},
                    },
                    columnArray: [
                        {name: 'notify_props', type: 'string'},
                    ],
                },
                [POSTS_IN_CHANNEL]: {
                    name: POSTS_IN_CHANNEL,
                    unsafeSql: undefined,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        earliest: {name: 'earliest', type: 'number'},
                        latest: {name: 'latest', type: 'number'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'earliest', type: 'number'},
                        {name: 'latest', type: 'number'},
                    ],
                },
                [DRAFT]: {
                    name: DRAFT,
                    unsafeSql: undefined,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        files: {name: 'files', type: 'string'},
                        message: {name: 'message', type: 'string'},
                        root_id: {name: 'root_id', type: 'string', isIndexed: true},
                        metadata: {name: 'metadata', type: 'string', isOptional: true},
                        update_at: {name: 'update_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'files', type: 'string'},
                        {name: 'message', type: 'string'},
                        {name: 'root_id', type: 'string', isIndexed: true},
                        {name: 'metadata', type: 'string', isOptional: true},
                        {name: 'update_at', type: 'number'},
                    ],
                },
                [FILE]: {
                    name: FILE,
                    unsafeSql: undefined,
                    columns: {
                        extension: {name: 'extension', type: 'string'},
                        height: {name: 'height', type: 'number'},
                        image_thumbnail: {name: 'image_thumbnail', type: 'string'},
                        local_path: {name: 'local_path', type: 'string', isOptional: true},
                        mime_type: {name: 'mime_type', type: 'string'},
                        name: {name: 'name', type: 'string'},
                        post_id: {name: 'post_id', type: 'string', isIndexed: true},
                        size: {name: 'size', type: 'number'},
                        width: {name: 'width', type: 'number'},
                    },
                    columnArray: [
                        {name: 'extension', type: 'string'},
                        {name: 'height', type: 'number'},
                        {name: 'image_thumbnail', type: 'string'},
                        {name: 'local_path', type: 'string', isOptional: true},
                        {name: 'mime_type', type: 'string'},
                        {name: 'name', type: 'string'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                        {name: 'size', type: 'number'},
                        {name: 'width', type: 'number'},
                    ],
                },
                [GROUP]: {
                    name: GROUP,
                    unsafeSql: undefined,
                    columns: {
                        display_name: {name: 'display_name', type: 'string'},
                        name: {name: 'name', type: 'string', isIndexed: true},
                        description: {name: 'description', type: 'string'},
                        source: {name: 'source', type: 'string'},
                        remote_id: {name: 'remote_id', type: 'string', isIndexed: true},
                        created_at: {name: 'created_at', type: 'number'},
                        updated_at: {name: 'updated_at', type: 'number'},
                        deleted_at: {name: 'deleted_at', type: 'number'},
                        member_count: {name: 'member_count', type: 'number'},
                    },
                    columnArray: [
                        {name: 'display_name', type: 'string'},
                        {name: 'name', type: 'string', isIndexed: true},
                        {name: 'description', type: 'string'},
                        {name: 'source', type: 'string'},
                        {name: 'remote_id', type: 'string', isIndexed: true},
                        {name: 'created_at', type: 'number'},
                        {name: 'updated_at', type: 'number'},
                        {name: 'deleted_at', type: 'number'},
                        {name: 'member_count', type: 'number'},
                    ],
                },
                [GROUP_CHANNEL]: {
                    name: GROUP_CHANNEL,
                    unsafeSql: undefined,
                    columns: {
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        created_at: {name: 'created_at', type: 'number'},
                        updated_at: {name: 'updated_at', type: 'number'},
                        deleted_at: {name: 'deleted_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'created_at', type: 'number'},
                        {name: 'updated_at', type: 'number'},
                        {name: 'deleted_at', type: 'number'},
                    ],
                },
                [GROUP_MEMBERSHIP]: {
                    name: GROUP_MEMBERSHIP,
                    unsafeSql: undefined,
                    columns: {
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        created_at: {name: 'created_at', type: 'number'},
                        updated_at: {name: 'updated_at', type: 'number'},
                        deleted_at: {name: 'deleted_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                        {name: 'created_at', type: 'number'},
                        {name: 'updated_at', type: 'number'},
                        {name: 'deleted_at', type: 'number'},
                    ],
                },
                [GROUP_TEAM]: {
                    name: GROUP_TEAM,
                    unsafeSql: undefined,
                    columns: {
                        group_id: {name: 'group_id', type: 'string', isIndexed: true},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        created_at: {name: 'created_at', type: 'number'},
                        updated_at: {name: 'updated_at', type: 'number'},
                        deleted_at: {name: 'deleted_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'group_id', type: 'string', isIndexed: true},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'created_at', type: 'number'},
                        {name: 'updated_at', type: 'number'},
                        {name: 'deleted_at', type: 'number'},
                    ],
                },
                [POSTS_IN_THREAD]: {
                    name: POSTS_IN_THREAD,
                    unsafeSql: undefined,
                    columns: {
                        earliest: {name: 'earliest', type: 'number'},
                        latest: {name: 'latest', type: 'number'},
                        root_id: {name: 'root_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'earliest', type: 'number'},
                        {name: 'latest', type: 'number'},
                        {name: 'root_id', type: 'string', isIndexed: true},
                    ],
                },
                [POST]: {
                    name: POST,
                    unsafeSql: undefined,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        create_at: {name: 'create_at', type: 'number'},
                        delete_at: {name: 'delete_at', type: 'number'},
                        edit_at: {name: 'edit_at', type: 'number'},
                        is_pinned: {name: 'is_pinned', type: 'boolean'},
                        message: {name: 'message', type: 'string'},
                        message_source: {name: 'message_source', type: 'string'},
                        metadata: {name: 'metadata', type: 'string', isOptional: true},
                        original_id: {name: 'original_id', type: 'string'},
                        pending_post_id: {name: 'pending_post_id', type: 'string', isIndexed: true},
                        previous_post_id: {name: 'previous_post_id', type: 'string'},
                        props: {name: 'props', type: 'string'},
                        root_id: {name: 'root_id', type: 'string'},
                        type: {name: 'type', type: 'string', isIndexed: true},
                        update_at: {name: 'update_at', type: 'number'},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'create_at', type: 'number'},
                        {name: 'delete_at', type: 'number'},
                        {name: 'edit_at', type: 'number'},
                        {name: 'is_pinned', type: 'boolean'},
                        {name: 'message', type: 'string'},
                        {name: 'message_source', type: 'string'},
                        {name: 'metadata', type: 'string', isOptional: true},
                        {name: 'original_id', type: 'string'},
                        {name: 'pending_post_id', type: 'string', isIndexed: true},
                        {name: 'previous_post_id', type: 'string'},
                        {name: 'props', type: 'string'},
                        {name: 'root_id', type: 'string'},
                        {name: 'type', type: 'string', isIndexed: true},
                        {name: 'update_at', type: 'number'},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [PREFERENCE]: {
                    name: PREFERENCE,
                    unsafeSql: undefined,
                    columns: {
                        category: {name: 'category', type: 'string', isIndexed: true},
                        name: {name: 'name', type: 'string'},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'category', type: 'string', isIndexed: true},
                        {name: 'name', type: 'string'},
                        {name: 'user_id', type: 'string', isIndexed: true},
                        {name: 'value', type: 'string'},
                    ],
                },
                [REACTION]: {
                    name: REACTION,
                    unsafeSql: undefined,
                    columns: {
                        create_at: {name: 'create_at', type: 'number'},
                        emoji_name: {name: 'emoji_name', type: 'string'},
                        post_id: {name: 'post_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'create_at', type: 'number'},
                        {name: 'emoji_name', type: 'string'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [MY_TEAM]: {
                    name: MY_TEAM,
                    unsafeSql: undefined,
                    columns: {
                        roles: {name: 'roles', type: 'string'},
                    },
                    columnArray: [
                        {name: 'roles', type: 'string'},
                    ],
                },
                [ROLE]: {
                    name: ROLE,
                    unsafeSql: undefined,
                    columns: {
                        name: {name: 'name', type: 'string', isIndexed: true},
                        permissions: {name: 'permissions', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string', isIndexed: true},
                        {name: 'permissions', type: 'string'},
                    ],
                },
                [SYSTEM]: {
                    name: SYSTEM,
                    unsafeSql: undefined,
                    columns: {
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'value', type: 'string'},
                    ],
                },
                [TEAM]: {
                    name: TEAM,
                    unsafeSql: undefined,
                    columns: {
                        allowed_domains: {name: 'allowed_domains', type: 'string'},
                        description: {name: 'description', type: 'string'},
                        display_name: {name: 'display_name', type: 'string'},
                        is_allow_open_invite: {
                            name: 'is_allow_open_invite',
                            type: 'boolean',
                        },
                        is_group_constrained: {
                            name: 'is_group_constrained',
                            type: 'boolean',
                        },
                        last_team_icon_updated_at: {
                            name: 'last_team_icon_updated_at',
                            type: 'number',
                        },
                        name: {name: 'name', type: 'string'},
                        type: {name: 'type', type: 'string'},
                        update_at: {name: 'update_at', type: 'number'},
                        invite_id: {name: 'invite_id', type: 'string'},
                    },
                    columnArray: [
                        {name: 'allowed_domains', type: 'string'},
                        {name: 'description', type: 'string'},
                        {name: 'display_name', type: 'string'},
                        {name: 'is_allow_open_invite', type: 'boolean'},
                        {name: 'is_group_constrained', type: 'boolean'},
                        {name: 'last_team_icon_updated_at', type: 'number'},
                        {name: 'name', type: 'string'},
                        {name: 'type', type: 'string'},
                        {name: 'update_at', type: 'number'},
                        {name: 'invite_id', type: 'string'},
                    ],
                },
                [TEAM_CHANNEL_HISTORY]: {
                    name: TEAM_CHANNEL_HISTORY,
                    unsafeSql: undefined,
                    columns: {
                        channel_ids: {name: 'channel_ids', type: 'string'},
                    },
                    columnArray: [
                        {name: 'channel_ids', type: 'string'},
                    ],
                },
                [TEAM_MEMBERSHIP]: {
                    name: TEAM_MEMBERSHIP,
                    unsafeSql: undefined,
                    columns: {
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                        scheme_admin: {name: 'scheme_admin', type: 'boolean'},
                    },
                    columnArray: [
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                        {name: 'scheme_admin', type: 'boolean'},
                    ],
                },
                [TEAM_SEARCH_HISTORY]: {
                    name: TEAM_SEARCH_HISTORY,
                    unsafeSql: undefined,
                    columns: {
                        created_at: {name: 'created_at', type: 'number'},
                        display_term: {name: 'display_term', type: 'string'},
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        term: {name: 'term', type: 'string'},
                    },
                    columnArray: [
                        {name: 'created_at', type: 'number'},
                        {name: 'display_term', type: 'string'},
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'term', type: 'string'},
                    ],
                },
                [THREAD]: {
                    name: THREAD,
                    unsafeSql: undefined,
                    columns: {
                        is_following: {name: 'is_following', type: 'boolean'},
                        last_reply_at: {name: 'last_reply_at', type: 'number'},
                        last_viewed_at: {name: 'last_viewed_at', type: 'number'},
                        reply_count: {name: 'reply_count', type: 'number'},
                        unread_mentions: {name: 'unread_mentions', type: 'number'},
                        unread_replies: {name: 'unread_replies', type: 'number'},
                        viewed_at: {name: 'viewed_at', type: 'number'},
                        last_fetched_at: {name: 'last_fetched_at', type: 'number', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'is_following', type: 'boolean'},
                        {name: 'last_reply_at', type: 'number'},
                        {name: 'last_viewed_at', type: 'number'},
                        {name: 'reply_count', type: 'number'},
                        {name: 'unread_mentions', type: 'number'},
                        {name: 'unread_replies', type: 'number'},
                        {name: 'viewed_at', type: 'number'},
                        {name: 'last_fetched_at', type: 'number', isIndexed: true},
                    ],
                },
                [THREAD_PARTICIPANT]: {
                    name: THREAD_PARTICIPANT,
                    unsafeSql: undefined,
                    columns: {
                        thread_id: {name: 'thread_id', type: 'string', isIndexed: true},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'thread_id', type: 'string', isIndexed: true},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [THREADS_IN_TEAM]: {
                    name: THREADS_IN_TEAM,
                    unsafeSql: undefined,
                    columns: {
                        team_id: {name: 'team_id', type: 'string', isIndexed: true},
                        thread_id: {name: 'thread_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'team_id', type: 'string', isIndexed: true},
                        {name: 'thread_id', type: 'string', isIndexed: true},
                    ],
                },
                [TEAM_THREADS_SYNC]: {
                    name: TEAM_THREADS_SYNC,
                    unsafeSql: undefined,
                    columns: {
                        earliest: {name: 'earliest', type: 'number'},
                        latest: {name: 'latest', type: 'number'},
                    },
                    columnArray: [
                        {name: 'earliest', type: 'number'},
                        {name: 'latest', type: 'number'},
                    ],
                },
                [USER]: {
                    name: USER,
                    unsafeSql: undefined,
                    columns: {
                        auth_service: {name: 'auth_service', type: 'string'},
                        delete_at: {name: 'delete_at', type: 'number'},
                        email: {name: 'email', type: 'string'},
                        first_name: {name: 'first_name', type: 'string'},
                        is_bot: {name: 'is_bot', type: 'boolean'},
                        is_guest: {name: 'is_guest', type: 'boolean'},
                        last_name: {name: 'last_name', type: 'string'},
                        last_picture_update: {name: 'last_picture_update', type: 'number'},
                        locale: {name: 'locale', type: 'string'},
                        nickname: {name: 'nickname', type: 'string'},
                        notify_props: {name: 'notify_props', type: 'string'},
                        position: {name: 'position', type: 'string'},
                        props: {name: 'props', type: 'string'},
                        remote_id: {name: 'remote_id', type: 'string', isOptional: true},
                        roles: {name: 'roles', type: 'string'},
                        status: {name: 'status', type: 'string'},
                        timezone: {name: 'timezone', type: 'string'},
                        update_at: {name: 'update_at', type: 'number'},
                        username: {name: 'username', type: 'string'},
                        terms_of_service_create_at: {name: 'terms_of_service_create_at', type: 'number'},
                        terms_of_service_id: {name: 'terms_of_service_id', type: 'string'},

                    },
                    columnArray: [
                        {name: 'auth_service', type: 'string'},
                        {name: 'delete_at', type: 'number'},
                        {name: 'email', type: 'string'},
                        {name: 'first_name', type: 'string'},
                        {name: 'is_bot', type: 'boolean'},
                        {name: 'is_guest', type: 'boolean'},
                        {name: 'last_name', type: 'string'},
                        {name: 'last_picture_update', type: 'number'},
                        {name: 'locale', type: 'string'},
                        {name: 'nickname', type: 'string'},
                        {name: 'notify_props', type: 'string'},
                        {name: 'position', type: 'string'},
                        {name: 'props', type: 'string'},
                        {name: 'remote_id', type: 'string', isOptional: true},
                        {name: 'roles', type: 'string'},
                        {name: 'status', type: 'string'},
                        {name: 'timezone', type: 'string'},
                        {name: 'update_at', type: 'number'},
                        {name: 'username', type: 'string'},
                        {name: 'terms_of_service_id', type: 'string'},
                        {name: 'terms_of_service_create_at', type: 'number'},
                    ],
                },
            },
        });
    });
});
