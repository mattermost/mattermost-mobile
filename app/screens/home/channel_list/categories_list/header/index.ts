// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {withServerUrl} from '@context/server';
import {observePushDisabledInServerAcknowledged} from '@queries/app/global';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue, observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {urlSafeBase64Encode} from '@utils/security';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({serverUrl, database}: Props) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const enableOpenServer = observeConfigBooleanValue(database, 'EnableOpenServer');

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
        distinctUntilChanged(),
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

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople: combineLatest([enableOpenServer, canAddUserToTeam]).pipe(
            switchMap(([openServer, addUser]) => of$(openServer && addUser)),
            distinctUntilChanged(),
        ),
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
        pushDisabledAck: observePushDisabledInServerAcknowledged(urlSafeBase64Encode(serverUrl)),
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelListHeader)));
