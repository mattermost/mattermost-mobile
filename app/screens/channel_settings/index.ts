// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap, combineLatestWith} from 'rxjs/operators';

import {observeIsCallsEnabledInChannel} from '@calls/observers';
import {observeCallsConfig} from '@calls/state';
import {General, Permissions} from '@constants';
import {withServerUrl} from '@context/server';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel, observePermissionForTeam, observeCanManageChannelSettings} from '@queries/servers/role';
import {
    observeConfigBooleanValue,
    observeConfigValue,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser, observeUserIsChannelAdmin, observeUserIsTeamAdmin} from '@queries/servers/user';
import {isTypeDMorGM, isDefaultChannel} from '@utils/channel';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemAdmin} from '@utils/user';

import ChannelSettings from './channel_settings';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
    serverUrl: string;
}

const enhanced = withObservables(['channelId'], ({channelId, serverUrl, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const type = channel.pipe(switchMap((c) => of$(c?.type)));
    const teamId = channel.pipe(switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))));
    const userId = observeCurrentUserId(database);
    const currentUser = observeCurrentUser(database);
    const team = observeCurrentTeam(database);
    const isTeamAdmin = combineLatest([teamId, userId]).pipe(
        switchMap(([tId, uId]) => observeUserIsTeamAdmin(database, uId, tId)),
    );

    // Calls observables
    const callsPluginEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.pluginEnabled)),
        distinctUntilChanged(),
    );
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
    const channelAdmin = userId.pipe(
        switchMap((uId) => observeUserIsChannelAdmin(database, uId, channelId)),
        distinctUntilChanged(),
    );
    const serverVersion = observeConfigValue(database, 'Version');
    const callsGAServer = serverVersion.pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 7, 6))),
    );
    const dmOrGM = type.pipe(switchMap((t) => of$(isTypeDMorGM(t))));
    const canEnableDisableCalls = combineLatest([callsPluginEnabled, callsDefaultEnabled, allowEnableCalls, systemAdmin, channelAdmin, callsGAServer, dmOrGM, isTeamAdmin]).pipe(
        switchMap(([pluginEnabled, liveMode, allow, sysAdmin, chAdmin, gaServer, dmGM, tAdmin]) => {
            if (!pluginEnabled) {
                return of$(false);
            }

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
    const isCallsEnabledInChannel = observeIsCallsEnabledInChannel(database, serverUrl, of$(channelId));

    const canManageSettings = currentUser.pipe(
        switchMap((u) => (u ? observeCanManageChannelSettings(database, channelId, u) : of$(false))),
        distinctUntilChanged(),
    );

    // canConvert observable (for Convert to private)
    const canConvert = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            if (!ch || !u || isDefaultChannel(ch)) {
                return of$(false);
            }
            if (ch.type !== General.OPEN_CHANNEL) {
                return of$(false);
            }
            return observePermissionForChannel(database, ch, u, Permissions.CONVERT_PUBLIC_CHANNEL_TO_PRIVATE, false);
        }),
    );

    // Archive observables
    const isArchived = channel.pipe(switchMap((c) => of$((c?.deleteAt || 0) > 0)));
    const canLeave = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            const isDC = isDefaultChannel(ch);
            return of$(!isDC || (isDC && u?.isGuest));
        }),
    );

    const canArchive = channel.pipe(
        combineLatestWith(currentUser, canLeave, isArchived, type),
        switchMap(([ch, u, leave, archived, chType]) => {
            if (
                chType === General.DM_CHANNEL || chType === General.GM_CHANNEL ||
                !ch || !u || !leave || archived
            ) {
                return of$(false);
            }

            if (chType === General.OPEN_CHANNEL) {
                return observePermissionForChannel(database, ch, u, Permissions.DELETE_PUBLIC_CHANNEL, true);
            }

            return observePermissionForChannel(database, ch, u, Permissions.DELETE_PRIVATE_CHANNEL, true);
        }),
    );

    const canUnarchive = team.pipe(
        combineLatestWith(currentUser, isArchived, type),
        switchMap(([t, u, archived, chType]) => {
            if (
                chType === General.DM_CHANNEL || chType === General.GM_CHANNEL ||
                !t || !u || !archived
            ) {
                return of$(false);
            }

            return observePermissionForTeam(database, t, u, Permissions.MANAGE_TEAM, false);
        }),
    );

    // Convert GM to channel observable
    const isGuestUser = currentUser.pipe(
        switchMap((u) => (u ? of$(u.isGuest) : of$(false))),
        distinctUntilChanged(),
    );

    const isConvertGMFeatureAvailable = serverVersion.pipe(
        switchMap((version) => of$(isMinimumServerVersion(version || '', 9, 1))),
    );

    const convertGMOptionAvailable = combineLatest([isConvertGMFeatureAvailable, type, isGuestUser]).pipe(
        switchMap(([available, chType, guest]) => of$(available && chType === General.GM_CHANNEL && !guest)),
    );

    // Channel autotranslation observable
    const isChannelAutotranslateEnabled = observeConfigBooleanValue(database, 'EnableAutoTranslation');

    return {
        canArchive,
        canConvert,
        canEnableDisableCalls,
        canManageSettings,
        canUnarchive,
        convertGMOptionAvailable,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName || ''))),
        isCallsEnabledInChannel,
        isChannelAutotranslateEnabled,
        isGuestUser,
        type,
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelSettings)));

