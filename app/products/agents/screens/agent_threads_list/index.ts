// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeLocalConversations} from '@agents/database/queries/local_agent';
import {observeAIThreads} from '@agents/database/queries/thread';

import AgentThreadsList from './agent_threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        threads: observeAIThreads(database),
        bots: observeAIBots(database),
        localConversations: observeLocalConversations(database),
    };
});

export default withDatabase(enhanced(AgentThreadsList));
