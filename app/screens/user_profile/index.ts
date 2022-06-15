// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser, observeUserIsChannelAdmin, observeUserIsTeamAdmin} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import UserProfile from './user_profile';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    userId: string;
    channelId?: string;
}

const enhanced = withObservables([], ({channelId, database, userId}: EnhancedProps) => {
    const currentUserId = observeCurrentUserId(database);
    const channel = channelId ? observeChannel(database, channelId) : of$(undefined);
    const user = observeUser(database, userId);
    const teammateDisplayName = observeTeammateNameDisplay(database);
    const isChannelAdmin = channelId ? observeUserIsChannelAdmin(database, userId, channelId) : of$(false);
    const isDirectMessage = channelId ? channel.pipe(
        switchMap((c) => of$(c?.type === General.DM_CHANNEL)),
    ) : of$(false);
    const teamId = channel.pipe(switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))));
    const isTeamAdmin = teamId.pipe(switchMap((id) => observeUserIsTeamAdmin(database, userId, id)));
    const systemAdmin = user.pipe(switchMap((u) => of$(u?.roles ? isSystemAdmin(u.roles) : false)));
    const enablePostIconOverride = observeConfigBooleanValue(database, 'EnablePostIconOverride');
    const enablePostUsernameOverride = observeConfigBooleanValue(database, 'EnablePostUsernameOverride');
    const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).
        observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getPreferenceAsBool(prefs, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)));

    return {
        currentUserId,
        enablePostIconOverride,
        enablePostUsernameOverride,
        isChannelAdmin,
        isDirectMessage,
        isMilitaryTime,
        isSystemAdmin: systemAdmin,
        isTeamAdmin,
        teamId,
        teammateDisplayName,
        user,
    };
});

export default withDatabase(enhanced(UserProfile));

