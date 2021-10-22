// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */

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
import type TeamModel from '@typings/database/models/servers/team';

const {SERVER: {MY_TEAM, PREFERENCE, TEAM}} = MM_TABLES;

const withTeams = withObservables([], ({database}: WithDatabaseArgs) => {
    const myTeams = database.get<MyTeamModel>(MY_TEAM).query().observe();
    const teamIds = database.get<TeamModel>(TEAM).query(
        Q.on(MY_TEAM, Q.where('id', Q.notEq(''))),
    ).observe().pipe(
        map((ts) => ts.map((t) => ({id: t.id, displayName: t.displayName}))),
    );
    const order = database.get<PreferenceModel>(PREFERENCE).query(
        Q.where('category', Preferences.TEAMS_ORDER),
    ).observe().pipe(
        switchMap((p) => (p.length ? of$(p[0].value.split(',')) : of$([]))),
    );
    const myOrderedTeams = combineLatest([myTeams, order, teamIds]).pipe(
        map(([ts, o, tids]) => {
            let ids: string[] = o;
            if (!o.length) {
                ids = tids.
                    sort((a, b) => a.displayName.toLocaleLowerCase().localeCompare(b.displayName.toLocaleLowerCase())).
                    map((t) => t.id);
            }

            const indexes: {[x: string]: number} = {};
            const originalIndexes: {[x: string]: number} = {};
            ids.forEach((v, i) => {
                indexes[v] = i;
            });

            ts.forEach((t, i) => {
                originalIndexes[t.id] = i;
            });

            return ts.sort((a, b) => {
                if ((indexes[a.id] != null) || (indexes[b.id] != null)) {
                    return (indexes[a.id] ?? -1) - (indexes[b.id] ?? -1);
                }
                return (originalIndexes[a.id] - originalIndexes[b.id]);
            });
        }),
    );
    return {
        myOrderedTeams,
    };
});

export default withDatabase(withTeams(TeamList));
