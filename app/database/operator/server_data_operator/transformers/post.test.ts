// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {
    transformDraftRecord,
    transformPostInThreadRecord,
    transformPostRecord,
    transformPostsInChannelRecord,
    transformSchedulePostsRecord,
} from '@database/operator/server_data_operator/transformers/post';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

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
        expect(preparedRecords!.collection.table).toBe('Post');
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
        expect(preparedRecords!.collection.table).toBe('PostsInThread');
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
                    root_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    message: 'draft message',
                    channel_id: 'channel_idp23232e',
                    files: [],
                    update_at: Date.now(),
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('Draft');
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
        expect(preparedRecords!.collection.table).toBe('PostsInChannel');
    });
});

describe('transformSchedulePostsRecord', () => {
    it('=> should create a ScheduledPost record from raw data', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformSchedulePostsRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'schedule_post_id',
                    channel_id: 'channel_id',
                    root_id: '',
                    message: 'schedule post message',
                    user_id: 'user_id',
                    processed_at: 0,
                    scheduled_at: 1223456789,
                    update_at: 0,
                    error_code: '',
                } as ScheduledPost,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('ScheduledPost');
    });

    it('should properly map all fields from raw data', async () => {
        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const rawPost = {
            id: 'schedule_post_id',
            channel_id: 'channel_id',
            root_id: 'root_id',
            message: 'test message',
            user_id: 'user_id',
            processed_at: 1000,
            scheduled_at: 2000,
            update_at: 3000,
            create_at: 4000,
            error_code: 'some_error',
            priority: undefined,
            file_ids: ['file_1', 'file_2'],
        } as ScheduledPost;

        const preparedRecord = await transformSchedulePostsRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {record: undefined, raw: rawPost},
        });

        expect(preparedRecord.id).toBe(rawPost.id);
        expect(preparedRecord.channelId).toBe(rawPost.channel_id);
        expect(preparedRecord.rootId).toBe(rawPost.root_id);
        expect(preparedRecord.message).toBe(rawPost.message);
        expect(preparedRecord.processedAt).toBe(rawPost.processed_at);
        expect(preparedRecord.scheduledAt).toBe(rawPost.scheduled_at);
        expect(preparedRecord.updateAt).toBe(rawPost.update_at);
        expect(preparedRecord.createAt).toBe(rawPost.create_at);
        expect(preparedRecord.errorCode).toBe(rawPost.error_code);
        expect(preparedRecord.metadata?.priority).toBe(rawPost.priority);
    });

    it('should set default values for missing fields', async () => {
        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();
        const rawPost = {
            id: 'schedule_post_id',
            channel_id: 'channel_id',
            user_id: 'user_id',
            create_at: 4000,
            scheduled_at: 2000,
            message: 'scheduled post message',
        } as ScheduledPost;

        const preparedRecord = await transformSchedulePostsRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {record: undefined, raw: rawPost},
        });

        expect(preparedRecord.rootId).toBe('');
        expect(preparedRecord.files).toEqual([]);
        expect(preparedRecord.metadata).toBeUndefined();
        expect(preparedRecord.updateAt).toBeGreaterThan(0);
        expect(preparedRecord.processedAt).toBe(0);
        expect(preparedRecord.errorCode).toBe('');
    });

    it('should not overwrite local errorCode if remote does not provide one', async () => {
        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const localErrorCode = 'local_error';
        const existingRecord = {
            errorCode: localErrorCode,
            prepareUpdate: jest.fn().mockReturnValue({
                errorCode: localErrorCode,
            }),
        } as unknown as ScheduledPostModel;

        const rawPost = {
            id: 'schedule_post_id',
            channel_id: 'channel_id',
            user_id: 'user_id',
            create_at: 4000,
            scheduled_at: 2000,
            message: 'schedule post message',
        } as ScheduledPost;

        const preparedRecord = await transformSchedulePostsRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {record: existingRecord, raw: rawPost},
        });

        expect(preparedRecord.errorCode).toBe(localErrorCode);
    });

    it('=> should return error if message and files are empty', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        let emptyMessageAndFileError;
        let preparedRecords;
        try {
            preparedRecords = await transformSchedulePostsRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'schedule_post_id',
                        channel_id: 'channel_id',
                        root_id: '',
                        message: '',
                        user_id: 'user_id',
                        processed_at: 0,
                        scheduled_at: 1223456789,
                        update_at: 0,
                        error_code: '',
                    } as ScheduledPost,
                },
            });
        } catch (error) {
            emptyMessageAndFileError = error;
        }

        expect(preparedRecords).not.toBeTruthy();
        expect(emptyMessageAndFileError).toBeTruthy();
    });
});
