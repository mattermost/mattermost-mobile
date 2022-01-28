// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {catchError, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

const {SERVER: {SYSTEM, TEAM}} = MM_TABLES;
import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap((id) => database.get<TeamModel>(TEAM).findAndObserve(id.value)),
        catchError(() => of$({displayName: ''})),
    );

    return {
        displayName: team.pipe(
            switchMap((t) => of$(t.displayName)),
        ),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
