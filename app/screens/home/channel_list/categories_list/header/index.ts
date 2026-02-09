// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue, observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
    );

    const canCreatePublicChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
        distinctUntilChanged(),
    );

    const canAddUserToTeam = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.ADD_USER_TO_TEAM, false)),
    );

    const guestAccountsEnabled = observeConfigBooleanValue(database, 'EnableGuestAccounts');

    const canInviteGuests = combineLatest([guestAccountsEnabled, currentUser, team]).pipe(
        switchMap(([enabled, u, t]) => {
            if (!enabled) {
                return of$(false);
            }
            return observePermissionForTeam(database, t, u, Permissions.INVITE_GUEST, false);
        }),
        distinctUntilChanged(),
    );

    const canInvitePeople = combineLatest([canAddUserToTeam, canInviteGuests]).pipe(
        switchMap(([add, invite]) => of$(add || invite)),
        distinctUntilChanged(),
    );

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople,
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
