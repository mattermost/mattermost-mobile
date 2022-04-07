// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {transformReactionRecord} from '@database/operator/server_data_operator/transformers/reaction';
import {sanitizeReactions} from '@database/operator/utils/reaction';

import type {HandleReactionsArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {REACTION} = MM_TABLES.SERVER;

export interface ReactionHandlerMix {
    handleReactions: ({postsReactions, prepareRecordsOnly}: HandleReactionsArgs) => Promise<Array<ReactionModel | CustomEmojiModel>>;
}

const ReactionHandler = (superclass: any) => class extends superclass {
    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction table from the 'Server' schema
     * @param {HandleReactionsArgs} handleReactions
     * @param {ReactionsPerPost[]} handleReactions.postsReactions
     * @param {boolean} handleReactions.prepareRecordsOnly
     * @param {boolean} handleReactions.skipSync
     * @throws DataOperatorException
     * @returns {Promise<Array<(ReactionModel | CustomEmojiModel)>>}
     */
    handleReactions = async ({postsReactions, prepareRecordsOnly, skipSync}: HandleReactionsArgs): Promise<ReactionModel[]> => {
        const batchRecords: ReactionModel[] = [];

        if (!postsReactions?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "postsReactions" array has been passed to the handleReactions method',
            );
            return [];
        }

        for await (const postReactions of postsReactions) {
            const {post_id, reactions} = postReactions;
            const {
                createReactions,
                deleteReactions,
            } = await sanitizeReactions({
                database: this.database,
                post_id,
                rawReactions: reactions,
                skipSync,
            });

            if (createReactions?.length) {
                // Prepares record for model Reactions
                const reactionsRecords = (await this.prepareRecords({
                    createRaws: createReactions,
                    transformer: transformReactionRecord,
                    tableName: REACTION,
                })) as ReactionModel[];
                batchRecords.push(...reactionsRecords);
            }

            if (deleteReactions?.length && !skipSync) {
                deleteReactions.forEach((outCast) => outCast.prepareDestroyPermanently());
                batchRecords.push(...deleteReactions);
            }
        }

        if (prepareRecordsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchRecords(batchRecords);
        }

        return batchRecords;
    };
};

export default ReactionHandler;
