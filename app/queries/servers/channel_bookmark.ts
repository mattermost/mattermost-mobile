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

const observeHasPermissionToBookmarks = (
    database: Database,
    channelId: string,
    public_permission: string,
    private_permission: string,
) => {
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

            const permission = c.type === General.OPEN_CHANNEL ? public_permission : private_permission;
            return observePermissionForChannel(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
};

export const observeCanAddBookmarks = (database: Database, channelId: string) => {
    return observeHasPermissionToBookmarks(
        database,
        channelId,
        Permissions.ADD_BOOKMARK_PUBLIC_CHANNEL,
        Permissions.ADD_BOOKMARK_PRIVATE_CHANNEL,
    );
};

export const observeCanEditBookmarks = (database: Database, channelId: string) => {
    return observeHasPermissionToBookmarks(
        database,
        channelId,
        Permissions.EDIT_BOOKMARK_PUBLIC_CHANNEL,
        Permissions.EDIT_BOOKMARK_PRIVATE_CHANNEL,
    );
};

export const observeCanDeleteBookmarks = (database: Database, channelId: string) => {
    return observeHasPermissionToBookmarks(
        database,
        channelId,
        Permissions.DELETE_BOOKMARK_PUBLIC_CHANNEL,
        Permissions.DELETE_BOOKMARK_PRIVATE_CHANNEL,
    );
};

export const getChannelBookmarkById = async (database: Database, bookmarkId: string) => {
    try {
        const bookmark = await database.get<ChannelBookmarkModel>(CHANNEL_BOOKMARK).find(bookmarkId);
        return bookmark;
    } catch {
        return undefined;
    }
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

export const getBookmarksSince = async (database: Database, channelId: string) => {
    try {
        const result = await database.get(CHANNEL_BOOKMARK).query(
            Q.unsafeSqlQuery(
                `SELECT 
                    COALESCE(
                        MAX (
                            MAX(COALESCE(create_at, 0)),
                            MAX(COALESCE(update_at, 0)),
                            MAX(COALESCE(delete_at, 0))
                        ) + 1, 0) as mostRecent
            FROM ChannelBookmark
            WHERE channel_id='${channelId}'`),
        ).unsafeFetchRaw();

        return result?.[0]?.mostRecent ?? 0;
    } catch {
        return 0;
    }
};

export const observeBookmarks = (database: Database, channelId: string) => {
    return queryBookmarks(database, channelId).observeWithColumns(['update_at', 'sort_order']);
};
