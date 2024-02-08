// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {withServerUrl} from '@context/server';
import EphemeralStore from '@store/ephemeral_store';

import TeamSidebar from './team_sidebar';

const enhanced = withObservables([], ({serverUrl}: {serverUrl: string}) => {
    // TODO https://mattermost.atlassian.net/browse/MM-43622
    // const canCreateTeams = observeCurrentUser(database).pipe(
    //     switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
    //     switchMap((values) => queryRolesByNames(database, values).observe()),
    //     switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))),
    // );

    return {
        canJoinOtherTeams: EphemeralStore.observeCanJoinOtherTeams(serverUrl),
    };
});

export default withServerUrl(enhanced(TeamSidebar));
