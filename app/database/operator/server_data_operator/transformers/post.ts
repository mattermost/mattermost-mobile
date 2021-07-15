// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type{TransformerArgs} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import {OperationType} from '@typings/database/enums';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type PostMetadataModel from '@typings/database/models/servers/post_metadata';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

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
 * @returns {Promise<PostModel>}
 */
export const transformPostRecord = ({action, database, value}: TransformerArgs): Promise<PostModel> => {
    const raw = value.raw as Post;
    const record = value.record as PostModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (post: PostModel) => {
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
    }) as Promise<PostModel>;
};

/**
 * transformPostInThreadRecord: Prepares a record of the SERVER database 'PostsInThread' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostsInThreadModel>}
 */
export const transformPostInThreadRecord = ({action, database, value}: TransformerArgs): Promise<PostsInThreadModel> => {
    const raw = value.raw as PostsInThread;
    const record = value.record as PostsInThreadModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postsInThread: PostsInThreadModel) => {
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
    }) as Promise<PostsInThreadModel>;
};

/**
 * transformFileRecord: Prepares a record of the SERVER database 'Files' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<FileModel>}
 */
export const transformFileRecord = ({action, database, value}: TransformerArgs): Promise<FileModel> => {
    const raw = value.raw as FileInfo;
    const record = value.record as FileModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (file: FileModel) => {
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
    }) as Promise<FileModel>;
};

/**
 * transformPostMetadataRecord: Prepares a record of the SERVER database 'PostMetadata' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostMetadataModel>}
 */
export const transformPostMetadataRecord = ({action, database, value}: TransformerArgs): Promise<PostMetadataModel> => {
    const raw = value.raw as Metadata;
    const record = value.record as PostMetadataModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postMeta: PostMetadataModel) => {
        postMeta._raw.id = isCreateAction ? postMeta.id : record.id;
        postMeta.data = raw.data;
        postMeta.postId = raw.post_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POST_METADATA,
        value,
        fieldsMapper,
    }) as Promise<PostMetadataModel>;
};

/**
 * transformDraftRecord: Prepares a record of the SERVER database 'Draft' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<DraftModel>}
 */
export const transformDraftRecord = ({action, database, value}: TransformerArgs): Promise<DraftModel> => {
    const emptyFileInfo: FileInfo[] = [];
    const raw = value.raw as Draft;

    // We use the raw id as  Draft is client side only and  we would only be creating/deleting drafts
    const fieldsMapper = (draft: DraftModel) => {
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
    }) as Promise<DraftModel>;
};

/**
 * transformPostsInChannelRecord: Prepares a record of the SERVER database 'PostsInChannel' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PostsInChannelModel>}
 */
export const transformPostsInChannelRecord = ({action, database, value}: TransformerArgs): Promise<PostsInChannelModel> => {
    const raw = value.raw as PostsInChannel;
    const record = value.record as PostsInChannelModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (postsInChannel: PostsInChannelModel) => {
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
    }) as Promise<PostsInChannelModel>;
};
