// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentUserId, observeCurrentTeamId} from '@queries/servers/system';

import StartARun from './start_a_run';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
    };
});

export default withDatabase(enhanced(StartARun));
