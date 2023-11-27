// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {queryGroupsByName, queryGroupMembershipForMember} from '@queries/servers/group';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, queryUsersLike} from '@queries/servers/user';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['mentionName'], ({database, mentionName}: {mentionName: string} & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    let mn = mentionName.toLowerCase();
    if ((/[._-]$/).test(mn)) {
        mn = mn.substring(0, mn.length - 1);
    }

    return {
        currentUserId,
        teammateNameDisplay,
        users: queryUsersLike(database, mn).observeWithColumns(['username']),
        groups: queryGroupsByName(database, mn).observeWithColumns(['name']),
        groupMemberships: currentUserId.pipe(switchMap((userId) => queryGroupMembershipForMember(database, userId).observe())),
    };
});

export default withDatabase(enhance(AtMention));
