// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    operateDraftRecord,
    operateFileRecord,
    operatePostInThreadRecord,
    operatePostMetadataRecord,
    operatePostRecord,
    operatePostsInChannelRecord,
} from '@database/admin/data_operator/operators/post';
import {createConnection} from '@database/admin/data_operator/operators/utils';
import {OperationType} from '@typings/database/enums';

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('***  POST Prepare Records Test ***', () => {
    it('=> operatePostRecord: should return an array of type Post', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: '8swgtrrdiff89jnsiwiip3y1eoe',
                    create_at: 1596032651748,
                    update_at: 1596032651748,
                    edit_at: 0,
                    delete_at: 0,
                    is_pinned: false,
                    user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                    channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                    root_id: 'ps81iqbesfby8jayz7owg4yypoo',
                    parent_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    original_id: '',
                    message: 'Testing operator post',
                    type: '',
                    props: {},
                    hashtags: '',
                    pending_post_id: '',
                    reply_count: 4,
                    last_reply_at: 0,
                    participants: null,
                    metadata: {},
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Post');
    });

    it('=> operatePostInThreadRecord: should return an array of type PostsInThread', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostInThreadRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    post_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                    earliest: 1596032651748,
                    latest: 1597032651748,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe(
            'PostsInThread',
        );
    });

    it('=> operateFileRecord: should return an array of type File', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateFileRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    name: 'test_file',
                    extension: '.jpg',
                    size: 1000,
                    create_at: 1609253011321,
                    delete_at: 1609253011321,
                    height: 20,
                    update_at: 1609253011321,
                    user_id: 'wqyby5r5pinxxdqhoaomtacdhc',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('File');
    });

    it('=> operatePostMetadataRecord: should return an array of type PostMetadata', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostMetadataRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81i4yypoo',
                    data: {},
                    postId: 'ps81iqbddesfby8jayz7owg4yypoo',
                    type: 'opengraph',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('PostMetadata');
    });

    it('=> operateDraftRecord: should return an array of type Draft', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateDraftRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81i4yypoo',
                    root_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    message: 'draft message',
                    channel_id: 'channel_idp23232e',
                    files: [],
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Draft');
    });

    it('=> operatePostsInChannelRecord: should return an array of type PostsInChannel', async () => {
        expect.assertions(3);

        const database = await createConnection('post_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostsInChannelRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81i4yypoo',
                    channel_id: 'channel_idp23232e',
                    earliest: 1608253011321,
                    latest: 1609253011321,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe(
            'PostsInChannel',
        );
    });
});
