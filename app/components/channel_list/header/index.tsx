// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {map} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import TeamModel from '@typings/database/models/servers/team';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeamName = withObservables(['teamId'], ({teamId, database}: {teamId: string} & WithDatabaseArgs) => ({
    teamName: database.get(MM_TABLES.SERVER.TEAM).findAndObserve(teamId).
        pipe(
            map<TeamModel, string>((team) => team.displayName),
        ),
}));

export default withDatabase(withTeamName(ChannelListHeader));
