// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';

import {observeCurrentTeamId} from '@queries/servers/system';
import {queryJoinedTeams} from '@queries/servers/team';

import SearchScreen from './search';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    return {
        teamId: currentTeamId,
        teams: queryJoinedTeams(database).observe(),
    };
});

export default compose(
    withDatabase,
    enhance,
)(SearchScreen);
