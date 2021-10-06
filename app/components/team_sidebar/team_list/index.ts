// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';

import TeamList from './team_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {MY_TEAM, PREFERENCE}} = MM_TABLES;

const withTeams = withObservables([], ({database}: WithDatabaseArgs) => {
    const teams = database.get<MyTeamModel>(MY_TEAM).query().observe();
    const order = database.get<PreferenceModel>(PREFERENCE).query(
        Q.where('category', Preferences.TEAMS_ORDER),
    ).observe().pipe(
        switchMap((p) => (p.length ? of$(p[0].value.split(',')) : of$([]))),
    );
    const myTeams = combineLatest([teams, order]).pipe(
        map(([ts, o]) => {
            if (o.length) {
                // eslint-disable-next-line max-nested-callbacks
                return o.map((id) => ts.find((t) => t.id === id)).filter((v) => v);
            }

            return ts;
        }),
    );
    return {
        myTeams,
    };
});

export default withDatabase(withTeams(TeamList));
