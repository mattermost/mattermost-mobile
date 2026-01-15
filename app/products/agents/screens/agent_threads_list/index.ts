// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {observeAIBots} from '@agents/database/queries/bot';
import {observeAIThreads} from '@agents/database/queries/thread';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import AgentThreadsList from './agent_threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        threads: observeAIThreads(database),
        bots: observeAIBots(database),
    };
});

export default withDatabase(enhanced(AgentThreadsList));
