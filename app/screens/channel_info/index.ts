// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap, combineLatestWith} from 'rxjs/operators';

import {observeIsCallsEnabledInChannel} from '@calls/observers';
import {observeCallsConfig} from '@calls/state';
import {withServerUrl} from '@context/server';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeCanManageChannelMembers, observeCanManageChannelSettings} from '@queries/servers/role';
import {
    observeConfigValue,
    observeCurrentChannelId,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser, observeUserIsChannelAdmin, observeUserIsTeamAdmin} from '@queries/servers/user';
import {isTypeDMorGM} from '@utils/channel';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemAdmin} from '@utils/user';

import ChannelInfo from './channel_info';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({serverUrl, database}: Props) => {
    const channel = observeCurrentChannel(database);
    const type = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelId = channel.pipe(switchMap((c) => of$(c?.id || '')));
    const teamId = channel.pipe(switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))));
    const userId = observeCurrentUserId(database);
    const currentUser = observeCurrentUser(database);
    const isTeamAdmin = combineLatest([teamId, userId]).pipe(
        switchMap(([tId, uId]) => observeUserIsTeamAdmin(database, uId, tId)),
    );

    // callsDefaultEnabled means "live mode" post 7.6
    const callsDefaultEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.DefaultEnabled)),
        distinctUntilChanged(),
    );
    const allowEnableCalls = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.AllowEnableCalls)),
        distinctUntilChanged(),
    );
    const systemAdmin = currentUser.pipe(
        switchMap((u) => (u ? of$(u.roles) : of$(''))),
        switchMap((roles) => of$(isSystemAdmin(roles || ''))),
        distinctUntilChanged(),
    );
    const channelAdmin = combineLatest([userId, channelId]).pipe(
        switchMap(([uId, chId]) => observeUserIsChannelAdmin(database, uId, chId)),
        distinctUntilChanged(),
    );
    const callsGAServer = observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 7, 6))),
    );
    const dmOrGM = type.pipe(switchMap((t) => of$(isTypeDMorGM(t))));
    const canEnableDisableCalls = combineLatest([callsDefaultEnabled, allowEnableCalls, systemAdmin, channelAdmin, callsGAServer, dmOrGM, isTeamAdmin]).pipe(
        switchMap(([liveMode, allow, sysAdmin, chAdmin, gaServer, dmGM, tAdmin]) => {
            // if GA 7.6:
            //   allow (will always be true) and !liveMode = system admins can enable/disable
            //   allow (will always be true) and liveMode = channel, team, system admins, DM/GM participants can enable/disable
            // if pre GA 7.6:
            //   allow and !liveMode  = channel, system admins, DM/GM participants can enable/disable
            //   allow and liveMode   = channel, system admins, DM/GM participants can enable/disable
            //   !allow and !liveMode = system admins can enable/disable -- can combine with below
            //   !allow and liveMode  = system admins can enable/disable -- can combine with above
            // Note: There are ways to 'simplify' the conditions below. Here we're preferring clarity.

            if (gaServer) {
                if (allow && !liveMode) {
                    return of$(Boolean(sysAdmin));
                }
                if (allow && liveMode) {
                    return of$(Boolean(chAdmin || tAdmin || sysAdmin || dmGM));
                }
                return of$(false);
            }

            // now we're pre GA 7.6
            if (allow && liveMode) {
                return of$(Boolean(chAdmin || sysAdmin || dmGM));
            }
            if (allow && !liveMode) {
                return of$(Boolean(sysAdmin || chAdmin || dmGM));
            }
            if (!allow) {
                return of$(Boolean(sysAdmin));
            }
            return of$(false);
        }),
    );
    const isCallsEnabledInChannel = observeIsCallsEnabledInChannel(database, serverUrl, observeCurrentChannelId(database));

    const canManageMembers = currentUser.pipe(
        combineLatestWith(channelId),
        switchMap(([u, cId]) => (u ? observeCanManageChannelMembers(database, cId, u) : of$(false))),
        distinctUntilChanged(),
    );

    const canManageSettings = currentUser.pipe(
        combineLatestWith(channelId),
        switchMap(([u, cId]) => (u ? observeCanManageChannelSettings(database, cId, u) : of$(false))),
        distinctUntilChanged(),
    );

    const isGuestUser = currentUser.pipe(
        switchMap((u) => (u ? of$(u.isGuest) : of$(false))),
        distinctUntilChanged(),
    );

    const isConvertGMFeatureAvailable = observeConfigValue(database, 'Version').pipe(
        switchMap((version) => of$(isMinimumServerVersion(version || '', 9, 1))),
    );

    return {
        type,
        canEnableDisableCalls,
        isCallsEnabledInChannel,
        canManageMembers,
        isCRTEnabled: observeIsCRTEnabled(database),
        canManageSettings,
        isGuestUser,
        isConvertGMFeatureAvailable,
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelInfo)));
