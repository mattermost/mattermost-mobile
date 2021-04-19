// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import {Q} from '@nozbe/watermelondb';
import {
    DataFactoryArgs,
    RawDraft,
    RawFile,
    RawPost,
    RawPostMetadata,
    RawPostsInChannel,
    RawPostsInThread,
} from '@typings/database/database';
import Draft from '@typings/database/draft';
import {OperationType} from '@typings/database/enums';
import File from '@typings/database/file';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';

const {
    DRAFT,
    FILE,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
} = MM_TABLES.SERVER;

/**
 * preparePostRecord: Prepares record of entity 'Post' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const preparePostRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawPost;
    const record = value.record as Post;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (post: Post) => {
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
        generator,
    });
};

/**
 * preparePostInThreadRecord: Prepares record of entity 'POSTS_IN_THREAD' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const preparePostInThreadRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawPostsInThread;
    const record = value.record as PostsInThread;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (postsInThread: PostsInThread) => {
        postsInThread.postId = isCreateAction ? raw.post_id : record.id;
        postsInThread.earliest = raw.earliest;
        postsInThread.latest = raw.latest!;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: POSTS_IN_THREAD,
        value,
        generator,
    });
};

/**
 * prepareFileRecord: Prepares record of entity 'FILE' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareFileRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawFile;
    const record = value.record as File;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (file: File) => {
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
        generator,
    });
};

/**
 * preparePostMetadataRecord: Prepares record of entity 'POST_METADATA' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const preparePostMetadataRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawPostMetadata;
    const record = value.record as PostMetadata;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (postMeta: PostMetadata) => {
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
        generator,
    });
};

/**
 * prepareDraftRecord: Prepares record of entity 'DRAFT' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareDraftRecord = ({action, database, value}: DataFactoryArgs) => {
    const emptyFileInfo: FileInfo[] = [];
    const raw = value.raw as RawDraft;

    // We use the raw id as  Draft is client side only and  we would only be creating/deleting drafts
    const generator = (draft: Draft) => {
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
        generator,
    });
};

/**
 * preparePostsInChannelRecord: Prepares record of entity 'POSTS_IN_CHANNEL' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const preparePostsInChannelRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawPostsInChannel;
    const record = value.record as PostsInChannel;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (postsInChannel: PostsInChannel) => {
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
        generator,
    });
};
