// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryJoinedTeams, queryMyTeams} from '@queries/servers/team';

import TeamList from './team_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeams = withObservables([], ({database}: WithDatabaseArgs) => {
    const myTeams = queryMyTeams(database).observe();
    const teamIds = queryJoinedTeams(database).observe().pipe(
        map((ts) => ts.map((t) => ({id: t.id, displayName: t.displayName}))),
    );
    const order = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.TEAMS_ORDER).
        observeWithColumns(['value']).pipe(
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
                    return (indexes[a.id] ?? tids.length) - (indexes[b.id] ?? tids.length);
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
