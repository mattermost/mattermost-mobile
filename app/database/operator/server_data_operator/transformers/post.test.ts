// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    transformDraftRecord,
    transformFileRecord,
    transformPostInThreadRecord,
    transformPostMetadataRecord,
    transformPostRecord,
    transformPostsInChannelRecord,
} from '@database/operator/server_data_operator/transformers/post';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {OperationType} from '@typings/database/enums';

describe('***  POST Prepare Records Test ***', () => {
    it('=> transformPostRecord: should return an array of type Post', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformPostRecord({
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
                    message: 'Testing composer post',
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
        expect(preparedRecords!.collection.modelClass.name).toBe('PostModel');
    });

    it('=> transformPostInThreadRecord: should return an array of type PostsInThread', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformPostInThreadRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                    earliest: 1596032651748,
                    latest: 1597032651748,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe(
            'PostsInThreadModel',
        );
    });

    it('=> transformFileRecord: should return an array of type File', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformFileRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'file-id',
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    name: 'test_file',
                    extension: '.jpg',
                    has_preview_image: true,
                    mime_type: 'image/jpeg',
                    size: 1000,
                    create_at: 1609253011321,
                    delete_at: 1609253011321,
                    height: 20,
                    width: 20,
                    update_at: 1609253011321,
                    user_id: 'wqyby5r5pinxxdqhoaomtacdhc',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('FileModel');
    });

    it('=> transformPostMetadataRecord: should return an array of type PostMetadata', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformPostMetadataRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81i4yypoo',
                    data: {
                        files: [
                            {
                                id: 'mjagj4ta4tb93f7mwdn68yw9rc',
                                user_id: 'gy5cnn5q9i8txdkcrj4dhntnta',
                                post_id: '4wpufe8d5pd7jpwshzrumgjd7r',
                                create_at: 1626207675617,
                                update_at: 1626207675617,
                                delete_at: 0,
                                name: 'Image Pasted at 2021-7-13 22-21.png',
                                extension: 'png',
                                size: 4668,
                                mime_type: 'image/png',
                                width: 67,
                                height: 116,
                                has_preview_image: true,
                                mini_preview: '/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APPv2c/gr8O/GvwHbWNW0CDW/Elxd6nbS3janMH090jj+xK1tDIHEUhZy0wjl27ANpDZXhP2kvgzo3wk8OeDjZPpbahfXE8bm2kdbqWKOOIieWFpXMSs7yKoYKxCZIGcCz+zvB8J5vD98vjIacmutFCLGfV4XlsIzvfzjKsfzmTGzAY7dp45zXjvirV9I1LXdRW4gXw7GLib7Iuh6J59uyo22IqWnDhZASzZ6bVwOTjuelS7vockKr9m4RUdd9r6equvkz//2Q==',
                            },
                        ],
                    },
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('PostMetadataModel');
    });

    it('=> transformDraftRecord: should return an array of type Draft', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformDraftRecord({
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
        expect(preparedRecords!.collection.modelClass.name).toBe('DraftModel');
    });

    it('=> transformPostsInChannelRecord: should return an array of type PostsInChannel', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformPostsInChannelRecord({
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
            'PostsInChannelModel',
        );
    });
});
