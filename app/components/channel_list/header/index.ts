// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {SystemModel} from '@app/database/models/server';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

const {SERVER: {SYSTEM, TEAM}} = MM_TABLES;
import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const withCurrentTeam = withObservables([], ({database}: WithDatabaseArgs) => ({
    team: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap((id) => database.get(TEAM).findAndObserve(id.value)),
    ),
}));

export default withDatabase(withCurrentTeam(ChannelListHeader));
