// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
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

    const enableOpenServer = observeConfigBooleanValue(database, 'EnableOpenServer');

    const enableGuestAccounts = observeConfigBooleanValue(database, 'EnableGuestAccounts');

    const buildEnterpriseReady = observeConfigBooleanValue(database, 'BuildEnterpriseReady');

    const teamIsGroupConstrained = team.pipe(
        switchMap((t) => of$(t?.isGroupConstrained)),
        distinctUntilChanged(),
    );

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
        distinctUntilChanged(),
    );

    const canCreatePublicChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
        distinctUntilChanged(),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
        distinctUntilChanged(),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
        distinctUntilChanged(),
    );

    const canAddUserToTeam = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.ADD_USER_TO_TEAM, false)),
        distinctUntilChanged(),
    );

    const canAddGuestToTeam = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.INVITE_GUEST, false)),
        distinctUntilChanged(),
    );

    const canInviteGuest = combineLatest([teamIsGroupConstrained, enableGuestAccounts, buildEnterpriseReady, canAddGuestToTeam]).pipe(
        switchMap(([isGroupConstrained, guestAccounts, enterpriseReady, addGuestToTeam]) => (
            of$(!isGroupConstrained && guestAccounts && enterpriseReady, addGuestToTeam)
        )),
        distinctUntilChanged(),
    );

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople: combineLatest([teamIsGroupConstrained, enableOpenServer, canAddUserToTeam, canInviteGuest]).pipe(
            switchMap(([isGroupConstrained, openServer, addUser, inviteGuest]) => of$(!isGroupConstrained && openServer && (addUser || inviteGuest))),
            distinctUntilChanged(),
        ),
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
