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
        map(([memberships, o, teams]) => {
            const sortedTeamIds = new Set(o);
            const membershipMap = new Map(memberships.map((m) => [m.id, m]));

            if (sortedTeamIds.size) {
                const mySortedTeams = [...sortedTeamIds].
                    filter((id) => id && membershipMap.has(id)).
                    map((id) => membershipMap.get(id)!);

                const extraTeams = teams.
                    filter((t) => t.id && !sortedTeamIds.has(t.id) && membershipMap.has(t.id)).
                    sort((a, b) => a.displayName.toLocaleLowerCase().localeCompare(b.displayName.toLocaleLowerCase())).
                    map((t) => membershipMap.get(t.id)!);

                return [...mySortedTeams, ...extraTeams];
            }

            return teams.
                filter((t) => t.id && membershipMap.has(t.id)).
                sort((a, b) => a.displayName.toLocaleLowerCase().localeCompare(b.displayName.toLocaleLowerCase())).
                map((t) => membershipMap.get(t.id)!);
        }),
    );
    return {
        myOrderedTeams,
    };
});

export default withDatabase(withTeams(TeamList));
