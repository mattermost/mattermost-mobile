// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';
import {Observable, of as of$} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostsById} from '@queries/servers/post';
import {observeConfigBooleanValue, observeRecentMentions} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import RecentMentionsScreen from './recent_mentions';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    // Get app database to query active servers
    const appDatabase = DatabaseManager.appDatabase?.database;

    // Create an observable to check for multiple workspaces
    const hasMultipleTeams: Observable<boolean> = appDatabase ?
        appDatabase.get<ServersModel>(MM_TABLES.APP.SERVERS).
            query(
                Q.and(
                    Q.where('identifier', Q.notEq('')),
                    Q.where('last_active_at', Q.gt(0)),
                ),
            ).
            observe().
            pipe(
                map((servers: ServersModel[]) => servers.length > 1),
            ) :
        of$(false);

    return {
        appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
        mentions: observeRecentMentions(database).pipe(
            switchMap((recentMentions) => {
                if (!recentMentions.length) {
                    return of$([]);
                }
                return queryPostsById(database, recentMentions, Q.asc).observe();
            }),
        ),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
        hasMultipleTeams,
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentMentionsScreen);
