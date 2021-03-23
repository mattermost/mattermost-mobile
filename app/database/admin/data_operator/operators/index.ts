// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {User} from '@database/server/models';
import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';
import App from '@typings/database/app';
import ChannelMembership from '@typings/database/channel_membership';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    DataFactory,
    RawApp,
    RawChannelMembership,
    RawCustomEmoji,
    RawDraft,
    RawFile,
    RawGlobal,
    RawGroupMembership,
    RawPost,
    RawPostMetadata,
    RawPostsInChannel,
    RawPostsInThread,
    RawPreference,
    RawReaction,
    RawRole,
    RawServers,
    RawSystem,
    RawTeamMembership,
    RawTermsOfService,
    RawUser,
} from '@typings/database/database';
import Draft from '@typings/database/draft';
import {OperationType} from '@typings/database/enums';
import File from '@typings/database/file';
import Global from '@typings/database/global';
import GroupMembership from '@typings/database/group_membership';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import Role from '@typings/database/role';
import Servers from '@typings/database/servers';
import System from '@typings/database/system';
import TeamMembership from '@typings/database/team_membership';
import TermsOfService from '@typings/database/terms_of_service';

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;
const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    GROUP_MEMBERSHIP,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
    PREFERENCE,
    REACTION,
    ROLE,
    SYSTEM,
    TEAM_MEMBERSHIP,
    TERMS_OF_SERVICE,
    USER,
} = MM_TABLES.SERVER;

/**
 * operateAppRecord: Prepares record of entity 'App' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateAppRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawApp;
    const record = value.record as App;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (app: App) => {
        app._raw.id = isCreateAction ? app.id : record.id;
        app.buildNumber = raw?.buildNumber;
        app.createdAt = raw?.createdAt;
        app.versionNumber = raw?.versionNumber;
    };

    return operateBaseRecord({
        action,
        database,
        generator,
        tableName: APP,
        value,
    });
};

/**
 * operateGlobalRecord: Prepares record of entity 'Global' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateGlobalRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawGlobal;
    const record = value.record as Global;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (global: Global) => {
        global._raw.id = isCreateAction ? global.id : record.id;
        global.name = raw?.name;
        global.value = raw?.value;
    };

    return operateBaseRecord({
        action,
        database,
        generator,
        tableName: GLOBAL,
        value,
    });
};

/**
 * operateServersRecord: Prepares record of entity 'Servers' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateServersRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawServers;
    const record = value.record as Servers;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (servers: Servers) => {
        servers._raw.id = isCreateAction ? servers.id : record.id;
        servers.dbPath = raw?.dbPath;
        servers.displayName = raw?.displayName;
        servers.mentionCount = raw?.mentionCount;
        servers.unreadCount = raw?.unreadCount;
        servers.url = raw?.url;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: SERVERS,
        value,
        generator,
    });
};

/**
 * operateCustomEmojiRecord: Prepares record of entity 'CustomEmoji' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateCustomEmojiRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawCustomEmoji;
    const record = value.record as CustomEmoji;
    const isCreateAction = action === OperationType.CREATE;

    // id of emoji comes from server response
    const generator = (emoji: CustomEmoji) => {
        emoji._raw.id = isCreateAction ? (raw?.id ?? emoji.id) : record.id;
        emoji.name = raw.name;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: CUSTOM_EMOJI,
        value,
        generator,
    });
};

/**
 * operateRoleRecord: Prepares record of entity 'Role' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateRoleRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawRole;
    const record = value.record as Role;
    const isCreateAction = action === OperationType.CREATE;

    // id of role comes from server response
    const generator = (role: Role) => {
        role._raw.id = isCreateAction ? (raw?.id ?? role.id) : record.id;
        role.name = raw?.name;
        role.permissions = raw?.permissions;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: ROLE,
        value,
        generator,
    });
};

/**
 * operateSystemRecord: Prepares record of entity 'System' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateSystemRecord = async ({action, database, value}: DataFactory) => {
    const raw = value.raw as RawSystem;
    const record = value.record as System;
    const isCreateAction = action === OperationType.CREATE;

    // id of role comes from server response
    const generator = (system: System) => {
        system._raw.id = isCreateAction ? (record?.id ?? system.id) : raw?.id;
        system.name = raw?.name;
        system.value = raw?.value;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: SYSTEM,
        value,
        generator,
    });
};

/**
 * operateTermsOfServiceRecord: Prepares record of entity 'TermsOfService' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateTermsOfServiceRecord = async ({action, database, value}: DataFactory) => {
    const record = value.raw as RawTermsOfService;

    const generator = (tos: TermsOfService) => {
        tos._raw.id = record?.id ?? tos.id;
        tos.acceptedAt = record?.acceptedAt;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: TERMS_OF_SERVICE,
        value,
        generator,
    });
};

/**
 * operatePostRecord: Prepares record of entity 'Post' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operatePostRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawPost;

    const generator = (post: Post) => {
        post._raw.id = record?.id;
        post.channelId = record?.channel_id;
        post.createAt = record?.create_at;
        post.deleteAt = record?.delete_at || record?.delete_at === 0 ? record?.delete_at : 0;
        post.editAt = record?.edit_at;
        post.updateAt = record?.update_at;
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

    return operateBaseRecord({
        action,
        database,
        tableName: POST,
        value,
        generator,
    });
};

/**
 * operatePostInThreadRecord: Prepares record of entity 'POSTS_IN_THREAD' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operatePostInThreadRecord = async ({action, database, value}: DataFactory) => {
    const record = value.raw as RawPostsInThread;

    const generator = (postsInThread: PostsInThread) => {
        postsInThread.postId = record.post_id;
        postsInThread.earliest = record.earliest;
        postsInThread.latest = record.latest!;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: POSTS_IN_THREAD,
        value,
        generator,
    });
};

/**
 * operateReactionRecord: Prepares record of entity 'REACTION' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateReactionRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawReaction;

    const generator = (reaction: Reaction) => {
        reaction._raw.id = reaction.id;
        reaction.userId = record.user_id;
        reaction.postId = record.post_id;
        reaction.emojiName = record.emoji_name;
        reaction.createAt = record.create_at;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: REACTION,
        value,
        generator,
    });
};

/**
 * operateFileRecord: Prepares record of entity 'FILE' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateFileRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const raw = value.raw as RawFile;
    const record = value.record as File;

    const isCreateAction = action === OperationType.CREATE;

    // id of emoji comes from server response
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

    return operateBaseRecord({
        action,
        database,
        tableName: FILE,
        value,
        generator,
    });
};

/**
 * operatePostMetadataRecord: Prepares record of entity 'POST_METADATA' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operatePostMetadataRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawPostMetadata;

    const generator = (postMeta: PostMetadata) => {
        postMeta._raw.id = postMeta.id;
        postMeta.data = record.data;
        postMeta.postId = record.postId;
        postMeta.type = record.type;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: POST_METADATA,
        value,
        generator,
    });
};

/**
 * operateDraftRecord: Prepares record of entity 'DRAFT' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateDraftRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawDraft;
    const emptyFileInfo: FileInfo[] = [];

    const generator = (draft: Draft) => {
        draft._raw.id = record?.id ?? draft.id;
        draft.rootId = record?.root_id ?? '';
        draft.message = record?.message ?? '';
        draft.channelId = record?.channel_id ?? '';
        draft.files = record?.files ?? emptyFileInfo;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: DRAFT,
        value,
        generator,
    });
};

/**
 * operatePostsInChannelRecord: Prepares record of entity 'POSTS_IN_CHANNEL' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operatePostsInChannelRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawPostsInChannel;

    const generator = (postsInChannel: PostsInChannel) => {
        postsInChannel._raw.id = record?.id ?? postsInChannel.id;
        postsInChannel.channelId = record.channel_id;
        postsInChannel.earliest = record.earliest;
        postsInChannel.latest = record.latest;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: POSTS_IN_CHANNEL,
        value,
        generator,
    });
};

/**
 * operateUserRecord: Prepares record of entity 'USER' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateUserRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawUser;

    const generator = (user: User) => {
        user._raw.id = record.id;
        user.authService = record.auth_service;
        user.deleteAt = record.delete_at;
        user.updateAt = record.update_at;
        user.email = record.email;
        user.firstName = record.first_name;
        user.isGuest = record.roles.includes('system_guest');
        user.lastName = record.last_name;
        user.lastPictureUpdate = record.last_picture_update;
        user.locale = record.locale;
        user.nickname = record.nickname;
        user.position = record?.position ?? '';
        user.roles = record.roles;
        user.username = record.username;
        user.notifyProps = record.notify_props;
        user.props = record.props;
        user.timezone = record.timezone;
        user.isBot = record.roles.includes('system_manager'); // FIXME : confirm is_bot
    };

    return operateBaseRecord({
        action,
        database,
        tableName: USER,
        value,
        generator,
    });
};

/**
 * operatePreferenceRecord: Prepares record of entity 'PREFERENCE' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operatePreferenceRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawPreference;

    const generator = (preference: Preference) => {
        preference._raw.id = record?.id ?? preference.id;
        preference.category = record.category;
        preference.name = record.name;
        preference.userId = record.user_id;
        preference.value = record.value;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: PREFERENCE,
        value,
        generator,
    });
};

/**
 * operatePreferenceRecord: Prepares record of entity 'TEAM_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateTeamMembershipRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawTeamMembership;

    const generator = (teamMembership: TeamMembership) => {
        teamMembership.teamId = record.team_id;
        teamMembership.userId = record.user_id;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: TEAM_MEMBERSHIP,
        value,
        generator,
    });
};

/**
 * operateGroupMembershipRecord: Prepares record of entity 'GROUP_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateGroupMembershipRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawGroupMembership;

    const generator = (groupMembership: GroupMembership) => {
        groupMembership.groupId = record.group_id;
        groupMembership.userId = record.user_id;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: GROUP_MEMBERSHIP,
        value,
        generator,
    });
};

/**
 * operateChannelMembershipRecord: Prepares record of entity 'CHANNEL_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {MatchExistingRecord} operator.value
 * @returns {Promise<void>}
 */
export const operateChannelMembershipRecord = async ({
    action,
    database,
    value,
}: DataFactory) => {
    const record = value.raw as RawChannelMembership;

    const generator = (groupMembership: ChannelMembership) => {
        groupMembership.channelId = record.channel_id;
        groupMembership.userId = record.user_id;
    };

    return operateBaseRecord({
        action,
        database,
        tableName: CHANNEL_MEMBERSHIP,
        value,
        generator,
    });
};

/**
 * operateBaseRecord:  The 'id' of a record is key to this function. Please note that - at the moment - if WatermelonDB
 * encounters an existing record during a CREATE operation, it silently fails the operation.
 *
 * This operator decides to go through an UPDATE action if we have an existing record in the table bearing the same id.
 * If not, it will go for a CREATE operation.
 *
 * However, if the tableName points to a major entity ( like Post, User or Channel, etc.), it verifies first if the
 * update_at value of the existing record is different from the parameter 'value' own update_at.  Only if they differ,
 * that it prepares the record for update.
 *
 * @param {DataFactory} operatorBase
 * @param {Database} operatorBase.database
 * @param {string} operatorBase.tableName
 * @param {MatchExistingRecord} operatorBase.value
 * @param {((model: Model) => void)} operatorBase.generator
 * @returns {Promise<any>}
 */
const operateBaseRecord = async ({
    action,
    database,
    tableName,
    value,
    generator,
}: DataFactory) => {
    if (action === OperationType.UPDATE) {
    // Two possible scenarios:
    // 1. We are dealing with either duplicates here and if so, we'll update instead of create
    // 2. This is just a normal update operation

        const record = value.record as Model;
        return record.prepareUpdate(() => generator!(record));
    }

    // Two possible scenarios
    // 1. We don't have a record yet to update; so we create it
    // 2. This is just a normal create operation
    return database.collections.get(tableName!).prepareCreate(generator);
};
