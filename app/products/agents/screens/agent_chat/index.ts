// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentUserId} from '@queries/servers/system';

import AgentChat from './agent_chat';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUserId: observeCurrentUserId(database),
    };
});

export default withDatabase(enhanced(AgentChat));
