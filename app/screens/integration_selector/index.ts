// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';

import IntegrationSelector from './integration_selector';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUserId: observeCurrentUserId(database),
    currentTeamId: observeCurrentTeamId(database),
}));

export default withDatabase(withTeamId(IntegrationSelector));
