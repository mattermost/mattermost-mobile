// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type{TransformerArgs} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const {
    DRAFT,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    SCHEDULED_POST,
} = MM_TABLES.SERVER;

/**
 * transformPostRecord: Prepares a record of the SERVER database 'Post' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostModel>}
 */
export const transformPostRecord = ({action, database, value}: TransformerArgs<PostModel, Post>): Promise<PostModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (post: PostModel) => {
        post._raw.id = isCreateAction ? (raw?.id ?? post.id) : record!.id;
        post.channelId = raw.channel_id;
        post.createAt = raw.create_at;
        post.deleteAt = raw.delete_at || raw.delete_at === 0 ? raw?.delete_at : 0;
        post.editAt = raw.edit_at;
        post.updateAt = raw.update_at;
        post.isPinned = Boolean(raw.is_pinned);
        post.message = raw.message;
        post.messageSource = raw.message_source || '';

        // When we extract the posts from the threads, we don't get the metadata
        // So, it might not be present in the raw post, so we use the one from the record
        const metadata = raw.metadata ?? post.metadata;
        post.metadata = metadata && Object.keys(metadata).length ? metadata : null;

        post.userId = raw.user_id;
        post.originalId = raw.original_id;
        post.pendingPostId = raw.pending_post_id;
        post.previousPostId = raw.prev_post_id ?? '';
        post.rootId = raw.root_id;
        post.type = raw.type ?? '';
        post.props = raw.props ?? {};
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POST,
        value,
        fieldsMapper,
    });
};

/**
 * transformPostInThreadRecord: Prepares a record of the SERVER database 'PostsInThread' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostsInThreadModel>}
 */
export const transformPostInThreadRecord = ({action, database, value}: TransformerArgs<PostsInThreadModel, PostsInThread>) => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (postsInThread: PostsInThreadModel) => {
        postsInThread._raw.id = isCreateAction ? (raw.id || postsInThread.id) : record!.id;
        postsInThread.rootId = raw.root_id;
        postsInThread.earliest = raw.earliest;
        postsInThread.latest = raw.latest!;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POSTS_IN_THREAD,
        value,
        fieldsMapper,
    });
};

/**
 * transformDraftRecord: Prepares a record of the SERVER database 'Draft' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<DraftModel>}
 */
export const transformDraftRecord = ({action, database, value}: TransformerArgs<DraftModel, Draft>): Promise<DraftModel> => {
    const emptyFileInfo: FileInfo[] = [];
    const emptyPostMetadata: PostMetadata = {};
    const raw = value.raw;

    // We use the raw id as  Draft is client side only and  we would only be creating/deleting drafts
    const fieldsMapper = (draft: DraftModel) => {
        draft._raw.id = draft.id;
        draft.rootId = raw?.root_id ?? '';
        draft.message = raw?.message ?? '';
        draft.channelId = raw?.channel_id ?? '';
        draft.files = raw?.files ?? emptyFileInfo;
        draft.metadata = raw?.metadata ?? emptyPostMetadata;
        draft.updateAt = raw.update_at ?? Date.now();
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: DRAFT,
        value,
        fieldsMapper,
    });
};

/**
 * transformPostsInChannelRecord: Prepares a record of the SERVER database 'PostsInChannel' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostsInChannelModel>}
 */
export const transformPostsInChannelRecord = ({action, database, value}: TransformerArgs<PostsInChannelModel, PostsInChannel>): Promise<PostsInChannelModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (postsInChannel: PostsInChannelModel) => {
        postsInChannel._raw.id = isCreateAction ? (raw.id || postsInChannel.id) : record!.id;
        postsInChannel.channelId = raw.channel_id;
        postsInChannel.earliest = raw.earliest;
        postsInChannel.latest = raw.latest;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POSTS_IN_CHANNEL,
        value,
        fieldsMapper,
    });
};

/**
 * transformPostRecords: Prepares records of the SERVER database 'ScheduledPosts' table for update or create actions.
 */
export const transformSchedulePostsRecord = ({action, database, value}: TransformerArgs<ScheduledPostModel, ScheduledPost>): Promise<ScheduledPostModel> => {
    const emptyFileInfo: FileInfo[] = [];
    const raw = value.raw;

    if (!raw.message && !raw.metadata?.files?.length) {
        throw new Error('Scheduled post message and files are empty');
    }

    const fieldsMapper = (scheduledPost: ScheduledPostModel) => {
        scheduledPost._raw.id = raw.id;
        scheduledPost.rootId = raw?.root_id ?? '';
        scheduledPost.message = raw?.message ?? '';
        scheduledPost.channelId = raw?.channel_id ?? '';
        scheduledPost.files = raw?.metadata?.files ?? emptyFileInfo;
        scheduledPost.metadata = raw?.metadata ?? null;
        if (raw.priority) {
            scheduledPost.metadata = {
                ...scheduledPost.metadata,
                priority: raw.priority,
            };
        }
        scheduledPost.updateAt = raw.update_at ?? Date.now();
        scheduledPost.createAt = raw.create_at;
        scheduledPost.scheduledAt = raw.scheduled_at;
        scheduledPost.processedAt = raw.processed_at ?? 0;
        scheduledPost.errorCode = raw.error_code || scheduledPost.errorCode;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SCHEDULED_POST,
        value,
        fieldsMapper,
    }) as Promise<ScheduledPostModel>;
};
