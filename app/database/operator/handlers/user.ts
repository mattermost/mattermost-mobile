// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordChannelMembershipEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/operator/comparators';
import {prepareCustomEmojiRecord} from '@database/operator/prepareRecords/general';
import {
    prepareChannelMembershipRecord,
    preparePreferenceRecord,
    prepareReactionRecord,
    prepareUserRecord,
} from '@database/operator/prepareRecords/user';
import {getRawRecordPairs, getUniqueRawsBy} from '@database/operator/utils/general';
import {sanitizeReactions} from '@database/operator/utils/reaction';
import ChannelMembership from '@typings/database/channel_membership';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    HandleChannelMembershipArgs,
    HandlePreferencesArgs,
    HandleReactionsArgs,
    HandleUsersArgs,
    RawReaction,
} from '@typings/database/database';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import User from '@typings/database/user';

const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    PREFERENCE,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

export interface UserHandlerMix {
    handleChannelMembership : ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => ChannelMembership[];
    handlePreferences : ({preferences, prepareRecordsOnly}: HandlePreferencesArgs) => Preference[];
    handleReactions : ({reactions, prepareRecordsOnly}: HandleReactionsArgs) =>(Reaction | CustomEmoji)[];
    handleUsers : ({users, prepareRecordsOnly}: HandleUsersArgs) => User[];
}

const UserHandler = (superclass: any) => class extends superclass {
    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP entity from the 'Server' schema
     * @param {HandleChannelMembershipArgs} channelMembershipsArgs
     * @param {RawChannelMembership[]} channelMembershipsArgs.channelMemberships
     * @param {boolean} channelMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {ChannelMembership[]}
     */
    handleChannelMembership = async ({channelMemberships, prepareRecordsOnly = true}: HandleChannelMembershipArgs) => {
        let records: ChannelMembership[] = [];

        if (!channelMemberships.length) {
            throw new DataOperatorException(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: channelMemberships, key: 'channel_id'});

        records = await this.handleEntityRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordChannelMembershipEqualToRaw,
            operator: prepareChannelMembershipRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: CHANNEL_MEMBERSHIP,
        });

        return records;
    };

    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE entity from the 'Server' schema
     * @param {HandlePreferencesArgs} preferencesArgs
     * @param {RawPreference[]} preferencesArgs.preferences
     * @param {boolean} preferencesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Preference[]}
     */
    handlePreferences = async ({preferences, prepareRecordsOnly = true}: HandlePreferencesArgs) => {
        let records: Preference[] = [];

        if (!preferences.length) {
            throw new DataOperatorException(
                'An empty "preferences" array has been passed to the handlePreferences method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: preferences, key: 'name'});

        records = await this.handleEntityRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordPreferenceEqualToRaw,
            operator: preparePreferenceRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: PREFERENCE,
        });

        return records;
    };

    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction entity from the 'Server' schema
     * @param {HandleReactionsArgs} handleReactions
     * @param {RawReaction[]} handleReactions.reactions
     * @param {boolean} handleReactions.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {(Reaction| CustomEmoji)[]}
     */
    handleReactions = async ({reactions, prepareRecordsOnly}: HandleReactionsArgs) => {
        let batchRecords: (Reaction| CustomEmoji)[] = [];

        if (!reactions.length) {
            throw new DataOperatorException(
                'An empty "reactions" array has been passed to the handleReactions method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: reactions, key: 'emoji_name'}) as RawReaction[];

        const database = await this.getDatabase(REACTION);

        const {
            createEmojis,
            createReactions,
            deleteReactions,
        } = await sanitizeReactions({
            database,
            post_id: reactions[0].post_id,
            rawReactions: rawValues,
        });

        if (createReactions.length) {
            // Prepares record for model Reactions
            const reactionsRecords = (await this.prepareRecords({
                createRaws: createReactions,
                database,
                recordOperator: prepareReactionRecord,
                tableName: REACTION,
            })) as Reaction[];
            batchRecords = batchRecords.concat(reactionsRecords);
        }

        if (createEmojis.length) {
            // Prepares records for model CustomEmoji
            const emojiRecords = (await this.prepareRecords({
                createRaws: getRawRecordPairs(createEmojis),
                database,
                recordOperator: prepareCustomEmojiRecord,
                tableName: CUSTOM_EMOJI,
            })) as CustomEmoji[];
            batchRecords = batchRecords.concat(emojiRecords);
        }

        batchRecords = batchRecords.concat(deleteReactions);

        if (prepareRecordsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchOperations({
                database,
                models: batchRecords,
            });
        }

        return [];
    };

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User entity from the 'Server' schema
     * @param {HandleUsersArgs} usersArgs
     * @param {RawUser[]} usersArgs.users
     * @param {boolean} usersArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {User[]}
     */
    handleUsers = async ({users, prepareRecordsOnly = true}: HandleUsersArgs) => {
        let records: User[] = [];

        if (!users.length) {
            throw new DataOperatorException(
                'An empty "users" array has been passed to the handleUsers method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: users, key: 'id'});

        records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordUserEqualToRaw,
            operator: prepareUserRecord,
            rawValues,
            tableName: USER,
            prepareRecordsOnly,
        });

        return records;
    };
};

export default UserHandler;
