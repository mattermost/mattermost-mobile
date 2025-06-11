// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest, switchMap, distinctUntilChanged} from 'rxjs';

import {Permissions, Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeCanManageChannelMembers, observePermissionForChannel} from '@queries/servers/role';
import {observeCurrentChannelId, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';

import ManageChannelMembers from './manage_channel_members';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const currentChannelId = observeCurrentChannelId(database);
    const currentChannel = observeCurrentChannel(database);

    const canManageAndRemoveMembers = combineLatest([currentChannelId, currentUser]).pipe(
        switchMap(([cId, u]) => (cId && u ? observeCanManageChannelMembers(database, cId, u) : of$(false))),
    );

    const canChangeMemberRoles = combineLatest([currentChannel, currentUser, canManageAndRemoveMembers]).pipe(
        switchMap(([c, u, m]) => (of$(c) && of$(u) && of$(m) && observePermissionForChannel(database, c, u, Permissions.MANAGE_CHANNEL_ROLES, true))),
    );

    const teammateDisplayNameSetting = observeTeammateNameDisplay(database);

    return {
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        canManageAndRemoveMembers,
        tutorialWatched: observeTutorialWatched(Tutorial.PROFILE_LONG_PRESS),
        canChangeMemberRoles,
        teammateDisplayNameSetting,
        channelAbacPolicyEnforced: currentChannel.pipe(
            switchMap((channel) => of$(channel?.abacPolicyEnforced || false)),
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(ManageChannelMembers));
