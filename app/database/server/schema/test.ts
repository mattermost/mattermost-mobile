// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import {serverSchema} from './index';

const {
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    POST,
    POSTS_IN_THREAD,
    POST_METADATA,
    ROLE,
    SYSTEM,
    TERMS_OF_SERVICE,
} = MM_TABLES.SERVER;

describe('*** Test schema for SERVER database ***', () => {
    it('=> The SERVER SCHEMA should strictly match', () => {
        expect(serverSchema).toEqual({
            version: 1,
            tables: {
                [CUSTOM_EMOJI]: {
                    name: CUSTOM_EMOJI,
                    columns: {
                        name: {name: 'name', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                    ],
                },
                [DRAFT]: {
                    name: DRAFT,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        files: {name: 'files', type: 'string'},
                        message: {name: 'message', type: 'string'},
                        root_id: {name: 'root_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'files', type: 'string'},
                        {name: 'message', type: 'string'},
                        {name: 'root_id', type: 'string', isIndexed: true},
                    ],
                },
                [FILE]: {
                    name: FILE,
                    columns: {
                        extension: {name: 'extension', type: 'string'},
                        height: {name: 'height', type: 'number'},
                        image_thumbnail: {name: 'image_thumbnail', type: 'string'},
                        local_path: {name: 'local_path', type: 'string'},
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
                        {name: 'local_path', type: 'string'},
                        {name: 'mime_type', type: 'string'},
                        {name: 'name', type: 'string'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                        {name: 'size', type: 'number'},
                        {name: 'width', type: 'number'},
                    ],
                },
                [POSTS_IN_THREAD]: {
                    name: POSTS_IN_THREAD,
                    columns: {
                        earliest: {name: 'earliest', type: 'number'},
                        latest: {name: 'latest', type: 'number'},
                        post_id: {name: 'post_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'earliest', type: 'number'},
                        {name: 'latest', type: 'number'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                    ],
                },
                [POST_METADATA]: {
                    name: POST_METADATA,
                    columns: {
                        data: {name: 'data', type: 'string'},
                        post_id: {name: 'post_id', type: 'string', isIndexed: true},
                        type: {name: 'type', type: 'string'},
                    },
                    columnArray: [
                        {name: 'data', type: 'string'},
                        {name: 'post_id', type: 'string', isIndexed: true},
                        {name: 'type', type: 'string'},
                    ],
                },
                [POST]: {
                    name: POST,
                    columns: {
                        channel_id: {name: 'channel_id', type: 'string', isIndexed: true},
                        create_at: {name: 'create_at', type: 'number'},
                        delete_at: {name: 'delete_at', type: 'number'},
                        edit_at: {name: 'edit_at', type: 'number'},
                        is_pinned: {name: 'is_pinned', type: 'boolean'},
                        message: {name: 'message', type: 'string'},
                        original_id: {name: 'original_id', type: 'string'},
                        pending_post_id: {name: 'pending_post_id', type: 'string'},
                        previous_post_id: {name: 'previous_post_id', type: 'string'},
                        props: {name: 'props', type: 'string'},
                        root_id: {name: 'root_id', type: 'string'},
                        type: {name: 'type', type: 'string'},
                        user_id: {name: 'user_id', type: 'string', isIndexed: true},
                    },
                    columnArray: [
                        {name: 'channel_id', type: 'string', isIndexed: true},
                        {name: 'create_at', type: 'number'},
                        {name: 'delete_at', type: 'number'},
                        {name: 'edit_at', type: 'number'},
                        {name: 'is_pinned', type: 'boolean'},
                        {name: 'message', type: 'string'},
                        {name: 'original_id', type: 'string'},
                        {name: 'pending_post_id', type: 'string'},
                        {name: 'previous_post_id', type: 'string'},
                        {name: 'props', type: 'string'},
                        {name: 'root_id', type: 'string'},
                        {name: 'type', type: 'string'},
                        {name: 'user_id', type: 'string', isIndexed: true},
                    ],
                },
                [ROLE]: {
                    name: ROLE,
                    columns: {
                        name: {name: 'name', type: 'string'},
                        permissions: {name: 'permissions', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                        {name: 'permissions', type: 'string'},
                    ],
                },
                [SYSTEM]: {
                    name: SYSTEM,
                    columns: {
                        name: {name: 'name', type: 'string'},
                        value: {name: 'value', type: 'string'},
                    },
                    columnArray: [
                        {name: 'name', type: 'string'},
                        {name: 'value', type: 'string'},
                    ],
                },
                [TERMS_OF_SERVICE]: {
                    name: TERMS_OF_SERVICE,
                    columns: {
                        accepted_at: {name: 'accepted_at', type: 'number'},
                    },
                    columnArray: [
                        {name: 'accepted_at', type: 'number'},
                    ],
                },
            },
        });
    });
});
