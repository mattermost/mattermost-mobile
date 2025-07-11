// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest} from 'rxjs';
import {map, mergeMap, switchMap} from 'rxjs/operators';

import {General, Permissions, Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeChannel} from '@queries/servers/channel';
import {observeCustomProfileAttributesByUserId, observeCustomProfileFields} from '@queries/servers/custom_profile';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCanManageChannelMembers, observePermissionForChannel} from '@queries/servers/role';
import {observeConfigBooleanValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeCurrentUser, observeUser, observeUserIsChannelAdmin, observeUserIsTeamAdmin} from '@queries/servers/user';
import {isDefaultChannel} from '@utils/channel';
import {isSystemAdmin, sortCustomProfileAttributes, convertToAttributesMap, convertProfileAttributesToCustomAttributes} from '@utils/user';

import UserProfile from './user_profile';

import type {CustomAttribute} from '@typings/api/custom_profile_attributes';
import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    userId: string;
    channelId?: string;
}

const enhanced = withObservables([], ({channelId, database, userId}: EnhancedProps) => {
    const currentUser = observeCurrentUser(database);
    const currentUserId = observeCurrentUserId(database);
    const channel = channelId ? observeChannel(database, channelId) : of$(undefined);
    const user = observeUser(database, userId);
    const teammateDisplayName = observeTeammateNameDisplay(database);
    const isChannelAdmin = channelId ? observeUserIsChannelAdmin(database, userId, channelId) : of$(false);
    const isDC = channel ? channel.pipe(
        switchMap((c) => of$(isDefaultChannel(c))),
    ) : of$(false);
    const isDirectMessage = channelId ? channel.pipe(
        switchMap((c) => of$(c?.type === General.DM_CHANNEL)),
    ) : of$(false);
    const teamId = channel.pipe(switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))));
    const isTeamAdmin = teamId.pipe(switchMap((id) => observeUserIsTeamAdmin(database, userId, id)));
    const systemAdmin = user.pipe(switchMap((u) => of$(u?.roles ? isSystemAdmin(u.roles) : false)));
    const enablePostIconOverride = observeConfigBooleanValue(database, 'EnablePostIconOverride');
    const enablePostUsernameOverride = observeConfigBooleanValue(database, 'EnablePostUsernameOverride');
    const preferences = queryDisplayNamePreferences(database).
        observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, Preferences.USE_MILITARY_TIME)));
    const isCustomStatusEnabled = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');
    const enableCustomAttributes = observeConfigBooleanValue(database, 'FeatureFlagCustomProfileAttributes');

    // Custom profile attributes
    const rawCustomAttributes = observeCustomProfileAttributesByUserId(database, userId);

    const customFields = observeCustomProfileFields(database);

    // Convert attributes to the format expected by the component
    const formattedCustomAttributes = combineLatest([rawCustomAttributes, customFields, enableCustomAttributes]).pipe(
        mergeMap(([attributes, fields, enabled]) => {
            if (!enabled || !attributes?.length) {
                return of$([] as CustomAttribute[]);
            }
            return of$(convertProfileAttributesToCustomAttributes(attributes, fields, sortCustomProfileAttributes, true));
        }),
        mergeMap((converted) => of$(convertToAttributesMap(converted))),
    );

    // can remove member
    const canManageAndRemoveMembers = combineLatest([channel, currentUser]).pipe(
        switchMap(([c, u]) => (c && u ? observeCanManageChannelMembers(database, c.id, u) : of$(false))));

    const canChangeMemberRoles = combineLatest([channel, currentUser, canManageAndRemoveMembers]).pipe(
        switchMap(([c, u, m]) => (of$(c?.id) && of$(u) && of$(m) && observePermissionForChannel(database, c, u, Permissions.MANAGE_CHANNEL_ROLES, true))));

    return {
        canManageAndRemoveMembers,
        currentUserId,
        enablePostIconOverride,
        enablePostUsernameOverride,
        isChannelAdmin,
        isCustomStatusEnabled,
        isDefaultChannel: isDC,
        isDirectMessage,
        isMilitaryTime,
        isSystemAdmin: systemAdmin,
        isTeamAdmin,
        teamId,
        teammateDisplayName,
        user,
        canChangeMemberRoles,
        hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
        enableCustomAttributes,
        customAttributesSet: formattedCustomAttributes,
    };
});

export default withDatabase(enhanced(UserProfile));

