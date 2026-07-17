// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeSelectedAgentId} from '@agents/queries/agents';

import ChannelSummarySheet from './channel_summary_sheet';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    selectedAgentId: observeSelectedAgentId(database),
}));

export default withDatabase(enhanced(ChannelSummarySheet));
