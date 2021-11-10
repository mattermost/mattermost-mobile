// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {getRawRecordPairs} from '@database/operator/utils/general';

import {transformRecentMentionsRecord} from '../transformers/recent_mentions';

import type {HandleRecentMentionsArgs} from '@typings/database/database';
import type RecentMentionsModel from '@typings/database/models/servers/recent_mentions';

const {RECENT_MENTIONS} = MM_TABLES.SERVER;

export interface RecentMentionsHandlerMix {
    handleRecentMentions: ({posts}: HandleRecentMentionsArgs) => Promise<RecentMentionsModel[]>;
}

const RecentMentionsHandler = (superclass: any) => class extends superclass {
    /**
     * handleRecentMentions: Handler responsible for the Create/Update operations occurring on the RECENT_MENTIONS table from the 'Server' schema
     * @param {HandleRecentMentionsArgs} recentMentionArgs
     * @param {RawRecentMentions[]} recentMentionArgs.mentions
     * @throws DataOperatorException
     * @returns {Promise<RecentMentionsModel[]>}
     */
    handleRecentMentions = async ({posts, order}: HandleRecentMentionsArgs): Promise<RecentMentionsModel[]> => {
        if (!order.length) {
            return [];
        }

        const existing = await this.database.get(RECENT_MENTIONS).query().fetch();
        const existingIds = existing.map((mention: RecentMentionsModel) => mention.id);

        const create: RecentMentions[] = order.reduce((curr: RecentMentions[], id: string) => {
            const post = posts[id];

            if (!existingIds.includes(id)) {
                curr.push({
                    post_id: id,
                    update_at: post.update_at,
                });
            }
            return curr;
        }, []);

        const records = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            transformer: transformRecentMentionsRecord,
            tableName: RECENT_MENTIONS,
        })) as RecentMentionsModel[];

        if (create.length) {
            await this.batchRecords(records);
        }

        return records;
    }
};

export default RecentMentionsHandler;
