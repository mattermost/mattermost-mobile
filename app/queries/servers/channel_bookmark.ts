// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap, combineLatestWith} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import {isDMorGM} from '@utils/channel';
import {isMinimumServerVersion} from '@utils/helpers';

import {observeChannel} from './channel';
import {observePermissionForChannel} from './role';
import {observeConfigValue} from './system';
import {observeCurrentUser} from './user';

const {CHANNEL_BOOKMARK} = MM_TABLES.SERVER;

export const observeAddBookmarks = (database: Database, channelId: string) => {
    const serverVersion = observeConfigValue(database, 'Version');
    const currentUser = observeCurrentUser(database);

    return observeChannel(database, channelId).pipe(
        combineLatestWith(currentUser, serverVersion),
        switchMap(([c, user, version]) => {
            if (!c || !user || c.deleteAt !== 0 || user?.isGuest || !isMinimumServerVersion(version || '', 9, 4)) {
                return of$(false);
            }

            if (isDMorGM(c)) {
                return of$(true);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.ADD_BOOKMARK_PUBLIC_CHANNEL : Permissions.ADD_BOOKMARK_PRIVATE_CHANNEL;
            return observePermissionForChannel(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
};

export const queryBookmarks = (database: Database, channelId: string) => {
    return database.get<ChannelBookmarkModel>(CHANNEL_BOOKMARK).query(
        Q.and(
            Q.where('channel_id', channelId),
            Q.where('delete_at', Q.eq(0)),
        ),
        Q.sortBy('sort_order', Q.asc),
    );
};

export const observeBookmarks = (database: Database, channelId: string) => {
    return queryBookmarks(database, channelId).observe();
};
