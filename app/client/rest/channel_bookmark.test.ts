// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import type ClientBase from './base';
import type {ClientChannelBookmarksMix} from './channel_bookmark';

describe('ClientChannelBookmarks', () => {
    let client: ClientChannelBookmarksMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('createChannelBookmark', async () => {
        const channelId = 'channel_id';
        const bookmark = {id: 'bookmark_id', display_name: 'bookmark_name'} as ChannelBookmark;
        const expectedUrl = client.getChannelBookmarksRoute(channelId);
        const expectedOptions = {
            method: 'post',
            body: bookmark,
            headers: {'Connection-Id': ''},
        };

        await client.createChannelBookmark(channelId, bookmark);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateChannelBookmark', async () => {
        const channelId = 'channel_id';
        const bookmark = {id: 'bookmark_id', display_name: 'new_bookmark_name'} as ChannelBookmark;
        const connectionId = 'connection_id';
        const expectedUrl = client.getChannelBookmarkRoute(channelId, bookmark.id);
        const expectedOptions = {
            method: 'patch',
            body: bookmark,
            headers: {'Connection-Id': connectionId},
        };

        await client.updateChannelBookmark(channelId, bookmark, connectionId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateChannelBookmarkSortOrder', async () => {
        const channelId = 'channel_id';
        const bookmarkId = 'bookmark_id';
        const newSortOrder = 1;
        const connectionId = 'connection_id';
        const expectedUrl = `${client.getChannelBookmarkRoute(channelId, bookmarkId)}/sort_order`;
        const expectedOptions = {
            method: 'post',
            body: newSortOrder,
            headers: {'Connection-Id': connectionId},
        };

        await client.updateChannelBookmarkSortOrder(channelId, bookmarkId, newSortOrder, connectionId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteChannelBookmark', async () => {
        const channelId = 'channel_id';
        const bookmarkId = 'bookmark_id';
        const connectionId = 'connection_id';
        const expectedUrl = client.getChannelBookmarkRoute(channelId, bookmarkId);
        const expectedOptions = {
            method: 'delete',
            headers: {'Connection-Id': connectionId},
        };

        await client.deleteChannelBookmark(channelId, bookmarkId, connectionId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelBookmarksForChannel', async () => {
        const channelId = 'channel_id';
        const since = 123456;
        const groupLabel = 'Login';
        const expectedUrl = `${client.getChannelBookmarksRoute(channelId)}${buildQueryString({bookmarks_since: since})}`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getChannelBookmarksForChannel(channelId, since, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
