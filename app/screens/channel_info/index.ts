// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, Observable, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap, combineLatestWith} from 'rxjs/operators';

import {observeIsCallsEnabledInChannel} from '@calls/observers';
import {observeCallsConfig} from '@calls/state';
import {General, Permissions} from '@constants';
import {withServerUrl} from '@context/server';
import {observeIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeCanAddBookmarks} from '@queries/servers/channel_bookmark';
import {observeCanManageChannelMembers, observeCanManageChannelSettings, observePermissionForChannel, observePermissionForTeam} from '@queries/servers/role';
import {
    observeConfigBooleanValue,
    observeConfigValue,
    observeCurrentChannelId,
    observeCurrentTeamId,
    observeCurrentUserId,
} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser, observeUserIsChannelAdmin, observeUserIsTeamAdmin} from '@queries/servers/user';
import {isTypeDMorGM, isDefaultChannel} from '@utils/channel';
import {isMinimumServerVersion} from '@utils/helpers';
import {isSystemAdmin} from '@utils/user';

import ChannelInfo from './channel_info';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

type Props = WithDatabaseArgs & {
    serverUrl: string;
}

const observeHasChannelSettingsActions = (
    database: Database,
    serverUrl: string,
    channelId: Observable<string>,
    channel: Observable<ChannelModel | undefined>,
    currentUser: Observable<UserModel | undefined>,
    type: Observable<ChannelType | undefined>,
) => {
    const teamId = channel.pipe(switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))));
    const userId = observeCurrentUserId(database);
    const isTeamAdmin = combineLatest([teamId, userId]).pipe(
        switchMap(([tId, uId]) => observeUserIsTeamAdmin(database, uId, tId)),
    );

    const callsPluginEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.pluginEnabled)),
        distinctUntilChanged(),
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
    const serverVersion = observeConfigValue(database, 'Version');
    const callsGAServer = serverVersion.pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 7, 6))),
    );
    const dmOrGM = type.pipe(switchMap((t) => of$(isTypeDMorGM(t))));

    const canEnableDisableCalls = combineLatest([callsPluginEnabled, callsDefaultEnabled, allowEnableCalls, systemAdmin, channelAdmin, callsGAServer, dmOrGM, isTeamAdmin]).pipe(
        switchMap(([pluginEnabled, liveMode, allow, sysAdmin, chAdmin, gaServer, dmGM, tAdmin]) => {
            // Always false if the plugin is not enabled.
            // if GA 7.6:
            //   allow (will always be true) and !liveMode = system admins can enable/disable
            //   allow (will always be true) and liveMode = channel, team, system admins, DM/GM participants can enable/disable
            // if pre GA 7.6:
            //   allow and !liveMode  = channel, system admins, DM/GM participants can enable/disable
            //   allow and liveMode   = channel, system admins, DM/GM participants can enable/disable
            //   !allow and !liveMode = system admins can enable/disable -- can combine with below
            //   !allow and liveMode  = system admins can enable/disable -- can combine with above
            // Note: There are ways to 'simplify' the conditions below. Here we're preferring clarity.

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

    const canManageSettings = currentUser.pipe(
        combineLatestWith(channelId),
        switchMap(([u, cId]) => (u ? observeCanManageChannelSettings(database, cId, u) : of$(false))),
        distinctUntilChanged(),
    );

    const isGuestUser = currentUser.pipe(
        switchMap((u) => (u ? of$(u.isGuest) : of$(false))),
        distinctUntilChanged(),
    );

    const isConvertGMFeatureAvailable = serverVersion.pipe(
        switchMap((version) => of$(isMinimumServerVersion(version || '', 9, 1))),
    );

    const isChannelAutotranslateEnabled = observeConfigBooleanValue(database, 'EnableAutoTranslation');

    const team = observeCurrentTeam(database);
    const isArchived = channel.pipe(switchMap((c) => of$((c?.deleteAt || 0) > 0)));
    const canLeave = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            const isDC = isDefaultChannel(ch);
            return of$(!isDC || (isDC && u?.isGuest));
        }),
    );

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

    const convertGMOptionAvailable = combineLatest([isConvertGMFeatureAvailable, type, isGuestUser]).pipe(
        switchMap(([available, chType, guest]) => of$(available && chType === General.GM_CHANNEL && !guest)),
    );

    // Check if any channel_settings action is available
    const hasChannelSettingsActions = combineLatest([
        canManageSettings,
        canConvert,
        canArchive,
        canUnarchive,
        canEnableDisableCalls,
        convertGMOptionAvailable,
        isChannelAutotranslateEnabled,
    ]).pipe(
        switchMap(([manageSettings, convert, archive, unarchive, enableCalls, convertGM, autotranslateEnabled]) => {
            return of$(
                manageSettings || // Edit channel or Channel autotranslations
                convert || // Convert to private
                archive || unarchive || // Archive channel
                enableCalls || // Enable/Disable calls
                convertGM || // Convert GM to channel
                (manageSettings && autotranslateEnabled), // Channel autotranslations
            );
        }),
    );

    return hasChannelSettingsActions;
};

const enhanced = withObservables([], ({serverUrl, database}: Props) => {
    const channel = observeCurrentChannel(database);
    const type = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelId = channel.pipe(switchMap((c) => of$(c?.id || '')));

    const currentUser = observeCurrentUser(database);

    const isCallsEnabledInChannel = observeIsCallsEnabledInChannel(database, serverUrl, observeCurrentChannelId(database));

    const canManageMembers = currentUser.pipe(
        combineLatestWith(channelId),
        switchMap(([u, cId]) => (u ? observeCanManageChannelMembers(database, cId, u) : of$(false))),
        distinctUntilChanged(),
    );

    const isBookmarksEnabled = observeConfigBooleanValue(database, 'FeatureFlagChannelBookmarks');

    const canAddBookmarks = channelId.pipe(
        switchMap((cId) => {
            return observeCanAddBookmarks(database, cId);
        }),
    );

    const isPlaybooksEnabled = observeIsPlaybooksEnabled(database);
    return {
        type,
        isCallsEnabledInChannel,
        canAddBookmarks,
        canManageMembers,
        isBookmarksEnabled,
        isCRTEnabled: observeIsCRTEnabled(database),
        isPlaybooksEnabled,
        hasChannelSettingsActions: observeHasChannelSettingsActions(database, serverUrl, channelId, channel, currentUser, type),
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelInfo)));
