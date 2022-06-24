// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observePermissionForTeam} from '@queries/servers/role';
import {observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (t && u ? observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true) : of$(false))),
        distinctUntilChanged(),
    );

    const canCreatePublicChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (t && u ? observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true) : of$(false))),
        distinctUntilChanged(),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => (t && u ? observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false) : of$(false))),
        distinctUntilChanged(),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
    );

    return {
        canCreateChannels,
        canJoinChannels,
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
