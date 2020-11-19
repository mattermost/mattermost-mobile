// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AppSchema, appSchema, tableSchema} from '@nozbe/watermelondb';
import {MM_TABLES} from '@constants/database';

export const defaultSchema: AppSchema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: MM_TABLES.SERVER.CHANNEL,
            columns: [
                {name: 'channel_id', type: 'string'},
                {name: 'create_at', type: 'number'},
                {name: 'creator_id', type: 'string', isIndexed: true},
                {name: 'delete_at', type: 'number'},
                {name: 'display_name', type: 'string'},
                {name: 'is_group_constrained', type: 'boolean'},
                {name: 'name', type: 'string'},
                {name: 'team_id', type: 'string', isIndexed: true},
                {name: 'type', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.CHANNEL_INFO,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'guest_count', type: 'number'},
                {name: 'header', type: 'string'},
                {name: 'member_count', type: 'number'},
                {name: 'pin_post_count', type: 'number'},
                {name: 'purpose', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.CHANNEL_MEMBERSHIP,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'user_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.CUSTOM_EMOJI,
            columns: [
                {name: 'emoji_id', type: 'string'},
                {name: 'name', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.DRAFT,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'files', type: 'string'},
                {name: 'message', type: 'string'},
                {name: 'root_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.FILE,
            columns: [
                {name: 'extension', type: 'string'},
                {name: 'file_id', type: 'string'},
                {name: 'height', type: 'number'},
                {name: 'image_thumbnail', type: 'string'},
                {name: 'local_path', type: 'string'},
                {name: 'mime_type', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'post_id', type: 'string', isIndexed: true},
                {name: 'size', type: 'number'},
                {name: 'width', type: 'number'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.GROUP,
            columns: [
                {name: 'display_name', type: 'string'},
                {name: 'group_id', type: 'string'},
                {name: 'name', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.GROUPS_IN_CHANNEL,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'group_id', type: 'string', isIndexed: true},
                {name: 'member_count', type: 'number'},
                {name: 'timezone_count', type: 'number'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.GROUPS_IN_TEAM,
            columns: [
                {name: 'group_id', type: 'string', isIndexed: true},
                {name: 'member_count', type: 'number'},
                {name: 'team_id', type: 'string', isIndexed: true},
                {name: 'timezone_count', type: 'number'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.GROUP_MEMBERSHIP,
            columns: [
                {name: 'group_id', type: 'string', isIndexed: true},
                {name: 'user_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.MY_CHANNEL,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'last_post_at', type: 'number'},
                {name: 'last_viewed_at', type: 'number'},
                {name: 'mentions_count', type: 'number'},
                {name: 'msg_count', type: 'number'},
                {name: 'roles', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.MY_CHANNEL_SETTINGS,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'notify_props', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.MY_TEAM,
            columns: [
                {name: 'is_unread', type: 'boolean'},
                {name: 'mentions_count', type: 'number'},
                {name: 'roles', type: 'string'},
                {name: 'team_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.POST,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'create_at', type: 'number'},
                {name: 'delete_at', type: 'number'},
                {name: 'edit_at', type: 'number'},
                {name: 'is_pinned', type: 'boolean'},
                {name: 'message', type: 'string'},
                {name: 'original_id', type: 'string'},
                {name: 'pending_post_id', type: 'string'},
                {name: 'post_id', type: 'string'},
                {name: 'previous_post_id', type: 'string'},
                {name: 'props', type: 'string'},
                {name: 'root_id', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'user_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.POSTS_IN_CHANNEL,
            columns: [
                {name: 'channel_id', type: 'string', isIndexed: true},
                {name: 'earliest', type: 'number'},
                {name: 'latest', type: 'number'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.POSTS_IN_THREAD,
            columns: [
                {name: 'earliest', type: 'number'},
                {name: 'latest', type: 'number'},
                {name: 'post_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.POST_METADATA,
            columns: [
                {name: 'data', type: 'string'},
                {name: 'post_id', type: 'string', isIndexed: true},
                {name: 'type', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.PREFERENCE,
            columns: [
                {name: 'category', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'user_id', type: 'string', isIndexed: true},
                {name: 'value', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.REACTION,
            columns: [
                {name: 'create_at', type: 'number'},
                {name: 'emoji_name', type: 'string'},
                {name: 'post_id', type: 'string', isIndexed: true},
                {name: 'reaction_id', type: 'string'},
                {name: 'user_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.ROLE,
            columns: [
                {name: 'name', type: 'string'},
                {name: 'permissions', type: 'string'},
                {name: 'role_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.SLASH_COMMAND,
            columns: [
                {name: 'auto_complete', type: 'boolean'},
                {name: 'description', type: 'string'},
                {name: 'display_name', type: 'string'},
                {name: 'hint', type: 'string'},
                {name: 'method', type: 'string'},
                {name: 'slash_id', type: 'string'},
                {name: 'team_id', type: 'string', isIndexed: true},
                {name: 'token', type: 'string'},
                {name: 'trigger', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.SYSTEM,
            columns: [
                {name: 'name', type: 'string'},
                {name: 'value', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.TEAM,
            columns: [
                {name: 'allowed_domains', type: 'string'},
                {name: 'allowed_open_invite', type: 'boolean'},
                {name: 'description', type: 'string'},
                {name: 'display_name', type: 'string'},
                {name: 'is_group_constrained', type: 'boolean'},
                {name: 'last_team_icon_updated_at', type: 'number'},
                {name: 'name', type: 'string'},
                {name: 'team_id', type: 'string'},
                {name: 'type', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.TEAM_CHANNEL_HISTORY,
            columns: [
                {name: 'channel_ids', type: 'string'},
                {name: 'team_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.TEAM_MEMBERSHIP,
            columns: [
                {name: 'team_id', type: 'string', isIndexed: true},
                {name: 'user_id', type: 'string', isIndexed: true},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.TEAM_SEARCH_HISTORY,
            columns: [
                {name: 'created_at', type: 'number'},
                {name: 'display_term', type: 'string'},
                {name: 'team_id', type: 'string', isIndexed: true},
                {name: 'term', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.TERMS_OF_SERVICE,
            columns: [
                {name: 'accepted_at', type: 'number'},
                {name: 'term_of_service_id', type: 'string'},
            ],
        }),
        tableSchema({
            name: MM_TABLES.SERVER.USER,
            columns: [
                {name: 'auth_service', type: 'string'},
                {name: 'delete_at', type: 'number'},
                {name: 'email', type: 'string'},
                {name: 'first_name', type: 'string'},
                {name: 'is_bot', type: 'boolean'},
                {name: 'is_guest', type: 'boolean'},
                {name: 'last_name', type: 'string'},
                {name: 'last_picture_update', type: 'number'},
                {name: 'locale', type: 'string'},
                {name: 'nick_name', type: 'string'},
                {name: 'notify_props', type: 'string'},
                {name: 'position', type: 'string'},
                {name: 'props', type: 'string'},
                {name: 'roles', type: 'string'},
                {name: 'status', type: 'string'},
                {name: 'time_zone', type: 'string'},
                {name: 'user_id', type: 'string'},
                {name: 'user_name', type: 'string'},
            ],
        }),
    ],
});
