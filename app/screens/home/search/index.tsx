// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';

import {observeConfigBooleanValue, observeCurrentTeamId} from '@queries/servers/system';
import {observeSortedJoinedTeams} from '@queries/servers/team';

import SearchScreen from './search';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    return {
        teamId: currentTeamId,
        teams: observeSortedJoinedTeams(database),
        crossTeamSearchEnabled: observeConfigBooleanValue(database, 'EnableCrossTeamSearch'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(SearchScreen);
