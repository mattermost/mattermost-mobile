// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentUserId} from '@queries/servers/system';

import TeamListItem from './team_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUserId: observeCurrentUserId(database),
}));

export default withDatabase(withSystem(TeamListItem));
