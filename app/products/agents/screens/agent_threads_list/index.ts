// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentTeamId} from '@queries/servers/system';

import AgentThreadsList from './agent_threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentTeamId: observeCurrentTeamId(database),
    };
});

export default withDatabase(enhanced(AgentThreadsList));
