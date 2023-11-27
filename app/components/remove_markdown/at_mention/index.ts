// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryGroupsByName} from '@queries/servers/group';
import {observeTeammateNameDisplay, queryUsersLike} from '@queries/servers/user';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['mentionName'], ({database, mentionName}: {mentionName: string} & WithDatabaseArgs) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    let mn = mentionName.toLowerCase();
    if ((/[._-]$/).test(mn)) {
        mn = mn.substring(0, mn.length - 1);
    }

    return {
        teammateNameDisplay,
        users: queryUsersLike(database, mn).observeWithColumns(['username']),
        groups: queryGroupsByName(database, mn).observeWithColumns(['name']),
    };
});

export default withDatabase(enhance(AtMention));
