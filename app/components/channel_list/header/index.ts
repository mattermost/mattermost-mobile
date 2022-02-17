// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {catchError, combineLatest, of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {observeCurrentUser} from '@queries/servers/user';
import {hasPermissionForTeam} from '@utils/role';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';

const {SERVER: {SYSTEM, TEAM}} = MM_TABLES;
const {CURRENT_TEAM_ID} = SYSTEM_IDENTIFIERS;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_TEAM_ID).pipe(
        switchMap((id) => database.get<TeamModel>(TEAM).findAndObserve(id.value)),
        catchError(() => of$({displayName: ''})),
    );

    const currentUser = observeCurrentUser(database);

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (('id' in t) ? from$(hasPermissionForTeam(t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)) : of$(false))),
    );

    const canCreatePublicChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (('id' in t) ? from$(hasPermissionForTeam(t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)) : of$(false))),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (('id' in t) ? from$(hasPermissionForTeam(t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)) : of$(false))),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
    );

    return {
        canCreateChannels,
        canJoinChannels,
        displayName: team.pipe(
            switchMap((t) => of$(t.displayName)),
        ),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
