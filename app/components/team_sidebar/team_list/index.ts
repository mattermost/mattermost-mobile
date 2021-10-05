// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

import TeamList from './team_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

const {SERVER: {MY_TEAM}} = MM_TABLES;

const withTeams = withObservables([], ({database}: WithDatabaseArgs) => {
    const myTeams = database.get<MyTeamModel>(MY_TEAM).query().observe();
    return {
        myTeams,
    };
});

export default withDatabase(withTeams(TeamList));
