// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {map} from 'rxjs/operators';

import {Database} from '@constants';

import ChannelList from './list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {SYSTEM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: database.collections.get<SystemModel>(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).
        pipe(
            map(({value}: {value: string}) => value),
        ),
}));

export default withDatabase(enhanced(ChannelList));
