// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeSelectedAgentId} from '@agents/queries/agents';

import UnreadsSummarizeSheet from './unreads_summarize_sheet';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    bots: observeAIBots(database),
    selectedAgentId: observeSelectedAgentId(database),
}));

export default withDatabase(enhanced(UnreadsSummarizeSheet));
