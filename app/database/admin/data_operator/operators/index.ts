// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {User} from '@database/server/models';
import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import App from '@typings/database/app';
import ChannelMembership from '@typings/database/channel_membership';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    DataFactory,
    IdenticalRecord,
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateAppRecord = async ({database, value}: DataFactory) => {
    const record = value as RawApp;

    const generator = (app: App) => {
        app._raw.id = record?.id ?? app.id;
        app.buildNumber = record?.buildNumber;
        app.createdAt = record?.createdAt;
        app.versionNumber = record?.versionNumber;
    };

    return operateBaseRecord({
        database,

        tableName: APP,
        value,
        generator,
    });
};

/**
 * operateGlobalRecord: Prepares record of entity 'Global' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateGlobalRecord = async ({database, value}: DataFactory) => {
    const record = value as RawGlobal;

    const generator = (global: Global) => {
        global._raw.id = record?.id ?? global.id;
        global.name = record?.name;
        global.value = record?.value;
    };

    return operateBaseRecord({
        database,

        tableName: GLOBAL,
        value,
        generator,
    });
};

/**
 * operateServersRecord: Prepares record of entity 'Servers' from the DEFAULT database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateServersRecord = async ({database, value}: DataFactory) => {
    const record = value as RawServers;

    const generator = (servers: Servers) => {
        servers._raw.id = record?.id ?? servers.id;
        servers.dbPath = record?.dbPath;
        servers.displayName = record?.displayName;
        servers.mentionCount = record?.mentionCount;
        servers.unreadCount = record?.unreadCount;
        servers.url = record?.url;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateCustomEmojiRecord = async ({database, value}: DataFactory) => {
    const record = value as RawCustomEmoji;

    const generator = (emoji: CustomEmoji) => {
        emoji._raw.id = record?.id ?? emoji.id;
        emoji.name = record.name;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateRoleRecord = async ({database, value}: DataFactory) => {
    const record = value as RawRole;

    const generator = (role: Role) => {
        role._raw.id = record?.id ?? role.id;
        role.name = record?.name;
        role.permissions = record?.permissions;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateSystemRecord = async ({database, value}: DataFactory) => {
    const record = value as RawSystem;

    const generator = (system: System) => {
        system._raw.id = record?.id ?? system.id;
        system.name = record?.name;
        system.value = record?.value;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateTermsOfServiceRecord = async ({database, value}: DataFactory) => {
    const record = value as RawTermsOfService;

    const generator = (tos: TermsOfService) => {
        tos._raw.id = record?.id ?? tos.id;
        tos.acceptedAt = record?.acceptedAt;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePostRecord = async ({database, value}: DataFactory) => {
    const record = value as RawPost;

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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePostInThreadRecord = async ({database, value}: DataFactory) => {
    const record = value as RawPostsInThread;

    const generator = (postsInThread: PostsInThread) => {
        postsInThread._raw.id = postsInThread.id;
        postsInThread.postId = record.post_id;
        postsInThread.earliest = record.earliest;
        postsInThread.latest = record.latest!;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateReactionRecord = async ({database, value}: DataFactory) => {
    const record = value as RawReaction;

    const generator = (reaction: Reaction) => {
        reaction._raw.id = reaction.id;
        reaction.userId = record.user_id;
        reaction.postId = record.post_id;
        reaction.emojiName = record.emoji_name;
        reaction.createAt = record.create_at;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateFileRecord = async ({database, value}: DataFactory) => {
    const record = value as RawFile;

    const generator = (file: File) => {
        file._raw.id = record?.id ?? file.id;
        file.postId = record.post_id;
        file.name = record.name;
        file.extension = record.extension;
        file.size = record.size;
        file.mimeType = record?.mime_type ?? '';
        file.width = record?.width ?? 0;
        file.height = record?.height ?? 0;
        file.imageThumbnail = record?.mini_preview ?? '';
        file.localPath = record?.localPath ?? '';
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePostMetadataRecord = async ({database, value}: DataFactory) => {
    const record = value as RawPostMetadata;

    const generator = (postMeta: PostMetadata) => {
        postMeta._raw.id = postMeta.id;
        postMeta.data = record.data;
        postMeta.postId = record.postId;
        postMeta.type = record.type;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateDraftRecord = async ({database, value}: DataFactory) => {
    const record = value as RawDraft;
    const emptyFileInfo: FileInfo[] = [];

    const generator = (draft: Draft) => {
        draft._raw.id = record?.id ?? draft.id;
        draft.rootId = record?.root_id ?? '';
        draft.message = record?.message ?? '';
        draft.channelId = record?.channel_id ?? '';
        draft.files = record?.files ?? emptyFileInfo;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePostsInChannelRecord = async ({database, value}: DataFactory) => {
    const record = value as RawPostsInChannel;

    const generator = (postsInChannel: PostsInChannel) => {
        postsInChannel._raw.id = record?.id ?? postsInChannel.id;
        postsInChannel.channelId = record.channel_id;
        postsInChannel.earliest = record.earliest;
        postsInChannel.latest = record.latest;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateUserRecord = async ({database, value}: DataFactory) => {
    const record = value as RawUser;

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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operatePreferenceRecord = async ({database, value}: DataFactory) => {
    const record = value as RawPreference;

    const generator = (preference: Preference) => {
        preference._raw.id = record?.id ?? preference.id;
        preference.category = record.category;
        preference.name = record.name;
        preference.userId = record.user_id;
        preference.value = record.value;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateTeamMembershipRecord = async ({database, value}: DataFactory) => {
    const record = value as RawTeamMembership;

    const generator = (teamMembership: TeamMembership) => {
        teamMembership.teamId = record.team_id;
        teamMembership.userId = record.user_id;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateGroupMembershipRecord = async ({database, value}: DataFactory) => {
    const record = value as RawGroupMembership;

    const generator = (groupMembership: GroupMembership) => {
        groupMembership.groupId = record.group_id;
        groupMembership.userId = record.user_id;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operator.value
 * @returns {Promise<void>}
 */
export const operateChannelMembershipRecord = async ({database, value}: DataFactory) => {
    const record = value as RawChannelMembership;

    const generator = (groupMembership: ChannelMembership) => {
        groupMembership.channelId = record.channel_id;
        groupMembership.userId = record.user_id;
    };

    return operateBaseRecord({
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
 * @param {RecordValue} operatorBase.value
 * @param {((model: Model) => void)} operatorBase.generator
 * @returns {Promise<any>}
 */
const operateBaseRecord = async ({
    database,
    tableName,
    value,
    generator,
}: DataFactory) => {
    // FIXME : The handler should be doing a single 'big' select query instead of making this operator do a query per record.  Then, you can use a flag 'isPresent' to distinguish between the database actions

    // FIXME : remove optional id field for all those Entities that are using type RawWithNoId

    let appRecord = [] as Model[];
    if (value?.id) { // We query first to see if we have a record on that entity with the current value.id
        appRecord = (await database.collections.
            get(tableName!).
            query(Q.where('id', value.id)).
            fetch()) as Model[];
    }

    if (appRecord?.length > 0) {
        const record = appRecord[0];

        // We avoid unnecessary updates if we already have a record with the same update_at value for this model/entity
        const isRecordIdentical = verifyUpdateAt({
            tableName: tableName!,
            newValue: value,
            existingRecord: record,
        });

        if (isRecordIdentical) {
            return null;
        }

        // Two possible scenarios:
        // 1. We are dealing with either duplicates here and if so, we'll update instead of create
        // 2. This is just a normal update operation
        return record.prepareUpdate(() => generator!(record));
    }

    // Two possible scenarios
    // 1. We don't have a record yet to update; so we create it
    // 2. This is just a normal create operation
    return database.collections.get(tableName!).prepareCreate(generator);
};

/**
 * verifyUpdateAt:
 * @param {IdenticalRecord} identicalRecord
 * @param {string} identicalRecord.tableName
 * @param {RecordValue} identicalRecord.newValue
 * @param {Model} identicalRecord.existingRecord
 * @returns {boolean}
 */
const verifyUpdateAt = ({tableName, newValue, existingRecord}: IdenticalRecord) => {
    const guardTables = [POST];
    if (guardTables.includes(tableName)) {
        switch (tableName) {
            case POST: {
                const tempPost = newValue as RawPost;
                const currentRecord = (existingRecord as unknown) as Post;
                return tempPost.update_at === currentRecord.updateAt;
            }
            default: {
                return false;
            }
        }
    }
    return false;
};
