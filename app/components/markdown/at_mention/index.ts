// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

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
    };
});

export default withDatabase(enhance(AtMention));
