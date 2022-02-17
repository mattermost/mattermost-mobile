// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

const {SERVER: {SYSTEM}} = MM_TABLES;
import ChannelList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: database.
        get<SystemModel>(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).
        pipe(switchMap((currentTeamId) => of$(currentTeamId.value))),
}));

export default withDatabase(enhanced(ChannelList));
