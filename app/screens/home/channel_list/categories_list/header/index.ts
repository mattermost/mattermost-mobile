// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {withServerUrl} from '@context/server';
import {observeRolesForTeam} from '@queries/servers/role';
import {observeConfig, observeConfigBooleanValue, observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam, queryMyTeams} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {isZeroPersistenceConfig, parseNonNegativeConfigNumber} from '@utils/config';
import {shareLatest} from '@utils/observable';
import {hasPermission} from '@utils/role';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
};

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const userRoles = currentUser.pipe(map((u) => u?.roles), distinctUntilChanged());
    const teamId = team.pipe(map((t) => t?.id), distinctUntilChanged());
    const teamRoles = combineLatest([teamId, userRoles]).pipe(
        switchMap(([tId, roles]) => observeRolesForTeam(database, tId, roles)),
        shareLatest(),
    );

    const observeTeamPermission = (permission: string, defaultValue: boolean) => teamRoles.pipe(
        map((roles) => (roles ? hasPermission(roles, permission) : defaultValue)),
        distinctUntilChanged(),
    );

    const canJoinChannels = observeTeamPermission(Permissions.JOIN_PUBLIC_CHANNELS, true);

    const canCreateChannels = combineLatest([
        observeTeamPermission(Permissions.CREATE_PUBLIC_CHANNEL, true),
        observeTeamPermission(Permissions.CREATE_PRIVATE_CHANNEL, false),
    ]).pipe(
        map(([open, priv]) => open || priv),
        distinctUntilChanged(),
    );

    const guestAccountsEnabled = observeConfigBooleanValue(database, 'EnableGuestAccounts');
    const canInviteGuests = combineLatest([guestAccountsEnabled, observeTeamPermission(Permissions.INVITE_GUEST, false)]).pipe(
        map(([enabled, canInvite]) => enabled && canInvite),
    );

    const canInvitePeople = combineLatest([observeTeamPermission(Permissions.ADD_USER_TO_TEAM, false), canInviteGuests]).pipe(
        map(([add, invite]) => add || invite),
        distinctUntilChanged(),
    );

    const teamsCount = queryMyTeams(database).observeCount(false);

    const config = observeConfig(database);

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople,
        canJoinOtherTeams: EphemeralStore.observeCanJoinOtherTeams(serverUrl),
        currentTeamId: teamId.pipe(map((id) => id ?? '')),
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        ephemeralModeEnabled: config.pipe(
            map((c) => c?.MobileEphemeralModeEnabled === 'true'),
            distinctUntilChanged(),
        ),
        ephemeralModePurgeHours: config.pipe(
            map((c) => parseNonNegativeConfigNumber(c?.MobileEphemeralModeOfflinePersistenceTimerHours)),
            distinctUntilChanged(),
        ),
        ephemeralModeCleanupDays: config.pipe(
            map((c) => parseNonNegativeConfigNumber(c?.MobileEphemeralModeAutoCacheCleanupDays)),
            distinctUntilChanged(),
        ),
        isZeroPersistenceMode: config.pipe(
            map((c) => isZeroPersistenceConfig(c)),
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
