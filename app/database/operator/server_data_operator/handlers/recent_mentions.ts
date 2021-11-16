// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {HandleRecentMentionsArgs} from '@typings/database/database';

export interface RecentMentionsHandlerMix {
    handleRecentMentions: ({order}: HandleRecentMentionsArgs) => Promise<string[]>;
}

const RecentMentionsHandler = (superclass: any) => class extends superclass {
    /**
     * handleRecentMentions: Handler responsible for the Create/Update operations occurring on the SYSTEM table from the 'Server' schema
     * @param {HandleRecentMentionsArgs} recentMentionArgs
     * @param {RawRecentMentions[]} recentMentionArgs.mentions
     * @throws DataOperatorException
     * @returns {Promise<RecentMentionsModel[]>}
     */
    handleRecentMentions = async ({order}: HandleRecentMentionsArgs): Promise<string[]> => {
        if (!order.length) {
            return [];
        }

        return order;
    }
};

export default RecentMentionsHandler;
