// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPostsById} from '@queries/servers/post';
import {observeConfigBooleanValue, observeRecentMentions} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import RecentMentionsScreen from './recent_mentions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    return {
        mentions: observeRecentMentions(database).pipe(
            switchMap((recentMentions) => {
                if (!recentMentions.length) {
                    return of$([]);
                }
                return queryPostsById(database, recentMentions, Q.asc).observe();
            }),
        ),
        currentUser,
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentMentionsScreen);
