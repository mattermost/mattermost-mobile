// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {observeAIBots} from '@agents/database/queries/bot';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import AgentChat from './agent_chat';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        bots: observeAIBots(database),
    };
});

export default withDatabase(enhanced(AgentChat));
