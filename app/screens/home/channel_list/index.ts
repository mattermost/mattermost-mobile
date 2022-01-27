// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {catchError, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import MyTeamModel from '@typings/database/models/servers/my_team';

import ChannelsList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {MY_TEAM, SYSTEM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap((id) => of$(id.value)),
        catchError(() => of$(undefined)),
    ),
    teamsCount: database.get<MyTeamModel>(MY_TEAM).query().observeCount(),
}));

export default withDatabase(enhanced(ChannelsList));
