// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {withServerUrl} from '@context/server';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue, observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam, queryMyTeams} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
};

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
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

    const teamsCount = queryMyTeams(database).observeCount(false);

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople,
        canJoinOtherTeams: EphemeralStore.observeCanJoinOtherTeams(serverUrl),
        currentTeamId: team.pipe(
            switchMap((t) => of$(t?.id ?? '')),
            distinctUntilChanged(),
        ),
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        hasMoreThanOneTeam: teamsCount.pipe(
            switchMap((v) => of$(v > 1)),
            distinctUntilChanged(),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelListHeader)));
