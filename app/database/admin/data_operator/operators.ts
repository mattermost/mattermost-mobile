// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { MM_TABLES } from '@constants/database';
import { Q } from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import App from '@typings/database/app';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    DataFactory,
    RawApp,
    RawCustomEmoji,
    RawGlobal,
    RawPost,
    RawPostsInThread,
    RawReaction,
    RawRole,
    RawServers,
    RawSystem,
    RawTermsOfService,
} from '@typings/database/database';
import Global from '@typings/database/global';
import Post from '@typings/database/post';
import PostsInThread from '@typings/database/posts_in_thread';
import Reaction from '@typings/database/reaction';
import Role from '@typings/database/role';
import Servers from '@typings/database/servers';
import System from '@typings/database/system';
import TermsOfService from '@typings/database/terms_of_service';
import { OperationType } from './index';

const { APP, GLOBAL, SERVERS } = MM_TABLES.DEFAULT;
const { CUSTOM_EMOJI, POST, POSTS_IN_THREAD, REACTION, ROLE, SYSTEM, TERMS_OF_SERVICE } = MM_TABLES.SERVER;

// FIXME : review all default values in the field mappings; they should make sense for mandatory fields
/**
 * operateAppRecord: Prepares record of entity 'App' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateAppRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawApp;

    const generator = (app: App) => {
        app._raw.id = record?.id ?? app.id;
        app.buildNumber = record?.buildNumber ?? '';
        app.createdAt = record?.createdAt ?? 0;
        app.versionNumber = record?.versionNumber ?? '';
    };

    return operateBaseRecord({ database, optType, tableName: APP, value, generator });
};

/**
 * operateGlobalRecord: Prepares record of entity 'Global' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateGlobalRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawGlobal;

    const generator = (global: Global) => {
        global._raw.id = record?.id ?? global.id;
        global.name = record?.name ?? '';
        global.value = record?.value ?? 0;
    };

    return operateBaseRecord({ database, optType, tableName: GLOBAL, value, generator });
};

/**
 * operateServersRecord: Prepares record of entity 'Servers' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateServersRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawServers;

    const generator = (servers: Servers) => {
        servers._raw.id = record?.id ?? servers.id;
        servers.dbPath = record?.dbPath ?? '';
        servers.displayName = record?.displayName ?? 0;
        servers.mentionCount = record?.mentionCount ?? 0;
        servers.unreadCount = record?.unreadCount ?? 0;
        servers.url = record?.url ?? 0;
    };

    return operateBaseRecord({ database, optType, tableName: SERVERS, value, generator });
};

/**
 * operateCustomEmojiRecord: Prepares record of entity 'CustomEmoji' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateCustomEmojiRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawCustomEmoji;

    const generator = (emoji: CustomEmoji) => {
        emoji._raw.id = record?.id ?? emoji.id;
        emoji.name = record?.name ?? '';
    };

    return operateBaseRecord({ database, optType, tableName: CUSTOM_EMOJI, value, generator });
};

/**
 * operateRoleRecord: Prepares record of entity 'Role' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateRoleRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawRole;

    const generator = (role: Role) => {
        role._raw.id = record?.id ?? role.id;
        role.name = record?.name ?? '';
        role.permissions = record?.permissions ?? [];
    };

    return operateBaseRecord({ database, optType, tableName: ROLE, value, generator });
};

/**
 * operateSystemRecord: Prepares record of entity 'System' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateSystemRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawSystem;

    const generator = (system: System) => {
        system._raw.id = record?.id ?? system.id;
        system.name = record?.name ?? '';
        system.value = record?.value ?? '';
    };

    return operateBaseRecord({ database, optType, tableName: SYSTEM, value, generator });
};

/**
 * operateTermsOfServiceRecord: Prepares record of entity 'TermsOfService' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateTermsOfServiceRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawTermsOfService;

    const generator = (tos: TermsOfService) => {
        tos._raw.id = record?.id ?? tos.id;
        tos.acceptedAt = record?.acceptedAt ?? 0;
    };

    return operateBaseRecord({ database, optType, tableName: TERMS_OF_SERVICE, value, generator });
};

/**
 * operatePostRecord: Prepares record of entity 'Post' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {OperationType} operator.optType
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePostRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawPost;

    // FIXME : need to handle draft post...and hence the post id might come from the record or the post object from the callback
    const generator = (post: Post) => {
        post._raw.id = record?.id;
        post.channelId = record?.channel_id;
        post.createAt = record?.create_at;
        post.deleteAt = record?.delete_at || record?.delete_at === 0 ? record?.delete_at : 0;
        post.editAt = record?.edit_at;
        post.isPinned = record!.is_pinned!;
        post.message = Q.sanitizeLikeString(record?.message);
        post.userId = record?.user_id;
        post.originalId = record?.original_id ?? '';
        post.pendingPostId = record?.pending_post_id ?? '';
        post.previousPostId = record?.prev_post_id ?? '';
        post.rootId = record?.root_id ?? '';
        post.type = record?.type ?? '';
        post.props = record?.props ?? {};
    };

    return operateBaseRecord({ database, optType, tableName: POST, value, generator });
};

export const operatePostInThreadRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawPostsInThread;

    const generator = (postsInThread: PostsInThread) => {
        postsInThread._raw.id = postsInThread.id;
        postsInThread.postId = record.post_id;
        postsInThread.earliest = record.earliest;
        postsInThread.latest = record.latest!;
    };

    return operateBaseRecord({ database, optType, tableName: POSTS_IN_THREAD, value, generator });
};

export const operateReactionRecord = async ({ database, optType, value }: DataFactory) => {
    const record = value as RawReaction;

    const generator = (reaction: Reaction) => {
        reaction._raw.id = reaction.id;
        reaction.userId = record.user_id;
        reaction.postId = record.post_id;
        reaction.emojiName = record.emoji_name;
        reaction.createAt = record.create_at;
    };

    return operateBaseRecord({ database, optType, tableName: REACTION, value, generator });
};

/**
 * operateBaseRecord:  The 'id' of a record is key to this function. Please note that - at the moment - if WatermelonDB
 * encounters an existing record during a CREATE operation, it silently fails the operation.
 *
 * In our case, we check to see if we have an existing 'id' and if so, we'll update the record with the data.
 * For an UPDATE operation, we fetch the existing record using the 'id' value and then we do the update operation;
 * if no record is found for that 'id', we'll create it a new record.
 *
 * @param {DataFactory} operatorBase
 * @param {Database} operatorBase.database
 * @param {OperationType} operatorBase.optType
 * @param {string} operatorBase.tableName
 * @param {RecordValue} operatorBase.value
 * @param {((model: Model) => void)} operatorBase.generator
 * @returns {Promise<any>}
 */
const operateBaseRecord = async ({ database, optType, tableName, value, generator }: DataFactory) => {
    // We query first to see if we have a record on that entity with the current value.id
    const appRecord = (await database.collections.get(tableName!).query(Q.where('id', value.id!)).fetch()) as Model[];

    const isPresent = appRecord.length > 0;

    if ((isPresent && optType === OperationType.CREATE) || (isPresent && optType === OperationType.UPDATE)) {
        // Two possible scenarios:
        // 1. We are dealing with either duplicates here and if so, we'll update instead of create
        // 2. This is just a normal update operation
        const record = appRecord[0];
        return record.prepareUpdate(() => generator!(record));
    }

    if ((!isPresent && optType === OperationType.UPDATE) || optType === OperationType.CREATE) {
        // Two possible scenarios
        // 1. We don't have a record yet to update; so we create it
        // 2. This is just a normal create operation
        return database.collections.get(tableName!).prepareCreate(generator);
    }

    return null;
};
