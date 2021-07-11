// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordChannelMembershipEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {transformCustomEmojiRecord} from '@database/operator/server_data_operator/transformers/general';
import {
    transformChannelMembershipRecord,
    transformPreferenceRecord,
    transformReactionRecord,
    transformUserRecord,
} from '@database/operator/server_data_operator/transformers/user';
import {getRawRecordPairs, getUniqueRawsBy} from '@database/operator/utils/general';
import {sanitizeReactions} from '@database/operator/utils/reaction';
import ChannelMembership from '@typings/database/models/servers/channel_membership';
import CustomEmoji from '@typings/database/models/servers/custom_emoji';
import {
    HandleChannelMembershipArgs,
    HandlePreferencesArgs,
    HandleReactionsArgs,
    HandleUsersArgs,
    RawReaction,
} from '@typings/database/database';
import Preference from '@typings/database/models/servers/preference';
import Reaction from '@typings/database/models/servers/reaction';
import User from '@typings/database/models/servers/user';

const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    PREFERENCE,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

export interface UserHandlerMix {
    handleChannelMembership: ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => Promise<ChannelMembership[]>;
    handlePreferences: ({preferences, prepareRecordsOnly}: HandlePreferencesArgs) => Promise<Preference[]>;
    handleReactions: ({reactions, prepareRecordsOnly}: HandleReactionsArgs) => Promise<Array<Reaction | CustomEmoji>>;
    handleUsers: ({users, prepareRecordsOnly}: HandleUsersArgs) => Promise<User[]>;
}

const UserHandler = (superclass: any) => class extends superclass {
    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP table from the 'Server' schema
     * @param {HandleChannelMembershipArgs} channelMembershipsArgs
     * @param {RawChannelMembership[]} channelMembershipsArgs.channelMemberships
     * @param {boolean} channelMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelMembership[]>}
     */
    handleChannelMembership = async ({channelMemberships, prepareRecordsOnly = true}: HandleChannelMembershipArgs) => {
        let records: ChannelMembership[] = [];

        if (!channelMemberships.length) {
            throw new DataOperatorException(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: channelMemberships, key: 'channel_id'});

        records = await this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordChannelMembershipEqualToRaw,
            transformer: transformChannelMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_MEMBERSHIP,
        });

        return records;
    };

    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE table from the 'Server' schema
     * @param {HandlePreferencesArgs} preferencesArgs
     * @param {RawPreference[]} preferencesArgs.preferences
     * @param {boolean} preferencesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<Preference[]>}
     */
    handlePreferences = async ({preferences, prepareRecordsOnly = true}: HandlePreferencesArgs) => {
        let records: Preference[] = [];

        if (!preferences.length) {
            throw new DataOperatorException(
                'An empty "preferences" array has been passed to the handlePreferences method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: preferences, key: 'name'});

        records = await this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordPreferenceEqualToRaw,
            transformer: transformPreferenceRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: PREFERENCE,
        });

        return records;
    };

    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction table from the 'Server' schema
     * @param {HandleReactionsArgs} handleReactions
     * @param {RawReaction[]} handleReactions.reactions
     * @param {boolean} handleReactions.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<(Reaction| CustomEmoji)[]>}
     */
    handleReactions = async ({reactions, prepareRecordsOnly}: HandleReactionsArgs) => {
        let batchRecords: Array<Reaction| CustomEmoji> = [];

        if (!reactions.length) {
            throw new DataOperatorException(
                'An empty "reactions" array has been passed to the handleReactions method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: reactions, key: 'emoji_name'}) as RawReaction[];

        const {
            createEmojis,
            createReactions,
            deleteReactions,
        } = await sanitizeReactions({
            database: this.database,
            post_id: reactions[0].post_id,
            rawReactions: rawValues,
        });

        if (createReactions.length) {
            // Prepares record for model Reactions
            const reactionsRecords = (await this.prepareRecords({
                createRaws: createReactions,
                transformer: transformReactionRecord,
                tableName: REACTION,
            })) as Reaction[];
            batchRecords = batchRecords.concat(reactionsRecords);
        }

        if (createEmojis.length) {
            // Prepares records for model CustomEmoji
            const emojiRecords = (await this.prepareRecords({
                createRaws: getRawRecordPairs(createEmojis),
                transformer: transformCustomEmojiRecord,
                tableName: CUSTOM_EMOJI,
            })) as CustomEmoji[];
            batchRecords = batchRecords.concat(emojiRecords);
        }

        batchRecords = batchRecords.concat(deleteReactions);

        if (prepareRecordsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchRecords(batchRecords);
        }

        return [];
    };

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User table from the 'Server' schema
     * @param {HandleUsersArgs} usersArgs
     * @param {RawUser[]} usersArgs.users
     * @param {boolean} usersArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<User[]>}
     */
    handleUsers = async ({users, prepareRecordsOnly = true}: HandleUsersArgs) => {
        let records: User[] = [];

        if (!users.length) {
            throw new DataOperatorException(
                'An empty "users" array has been passed to the handleUsers method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: users, key: 'id'});

        records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordUserEqualToRaw,
            transformer: transformUserRecord,
            createOrUpdateRawValues,
            tableName: USER,
            prepareRecordsOnly,
        });

        return records;
    };
};

export default UserHandler;
