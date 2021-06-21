// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import type{
    TransformerArgs,
    RawDraft,
    RawFile,
    RawPost,
    RawPostMetadata,
    RawPostsInChannel,
    RawPostsInThread,
} from '@typings/database/database';
import Draft from '@typings/database/models/servers/draft';
import {OperationType} from '@typings/database/enums';
import File from '@typings/database/models/servers/file';
import Post from '@typings/database/models/servers/post';
import PostMetadata from '@typings/database/models/servers/post_metadata';
import PostsInChannel from '@typings/database/models/servers/posts_in_channel';
import PostsInThread from '@typings/database/models/servers/posts_in_thread';

const {
    DRAFT,
    FILE,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
} = MM_TABLES.SERVER;

/**
 * transformPostRecord: Prepares a record of the SERVER database 'Post' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformPostRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawPost;
    const record = value.record as Post;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (post: Post) => {
        post._raw.id = isCreateAction ? (raw?.id ?? post.id) : record.id;
        post.channelId = raw.channel_id;
        post.createAt = raw.create_at;
        post.deleteAt = raw.delete_at || raw.delete_at === 0 ? raw?.delete_at : 0;
        post.editAt = raw.edit_at;
        post.updateAt = raw.update_at;
        post.isPinned = Boolean(raw.is_pinned);
        post.message = Q.sanitizeLikeString(raw.message);
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
 * @returns {Promise<Model>}
 */
export const transformPostInThreadRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawPostsInThread;
    const record = value.record as PostsInThread;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postsInThread: PostsInThread) => {
        postsInThread.postId = isCreateAction ? raw.post_id : record.id;
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
 * transformFileRecord: Prepares a record of the SERVER database 'Files' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformFileRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawFile;
    const record = value.record as File;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (file: File) => {
        file._raw.id = isCreateAction ? (raw?.id ?? file.id) : record.id;
        file.postId = raw.post_id;
        file.name = raw.name;
        file.extension = raw.extension;
        file.size = raw.size;
        file.mimeType = raw?.mime_type ?? '';
        file.width = raw?.width ?? 0;
        file.height = raw?.height ?? 0;
        file.imageThumbnail = raw?.mini_preview ?? '';
        file.localPath = raw?.localPath ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: FILE,
        value,
        fieldsMapper,
    });
};

/**
 * transformPostMetadataRecord: Prepares a record of the SERVER database 'PostMetadata' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformPostMetadataRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawPostMetadata;
    const record = value.record as PostMetadata;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postMeta: PostMetadata) => {
        postMeta._raw.id = isCreateAction ? postMeta.id : record.id;
        postMeta.data = raw.data;
        postMeta.postId = raw.postId;
        postMeta.type = raw.type;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POST_METADATA,
        value,
        fieldsMapper,
    });
};

/**
 * transformDraftRecord: Prepares a record of the SERVER database 'Draft' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformDraftRecord = ({action, database, value}: TransformerArgs) => {
    const emptyFileInfo: FileInfo[] = [];
    const raw = value.raw as RawDraft;

    // We use the raw id as  Draft is client side only and  we would only be creating/deleting drafts
    const fieldsMapper = (draft: Draft) => {
        draft._raw.id = draft.id;
        draft.rootId = raw?.root_id ?? '';
        draft.message = raw?.message ?? '';
        draft.channelId = raw?.channel_id ?? '';
        draft.files = raw?.files ?? emptyFileInfo;
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
 * @returns {Promise<Model>}
 */
export const transformPostsInChannelRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawPostsInChannel;
    const record = value.record as PostsInChannel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postsInChannel: PostsInChannel) => {
        postsInChannel._raw.id = isCreateAction ? postsInChannel.id : record.id;
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
