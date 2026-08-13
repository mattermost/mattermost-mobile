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
        const bookmark = {
            id: '',
            create_at: 0,
            update_at: 0,
            delete_at: 0,
            channel_id: channelId,
            owner_id: 'owner_id',
            display_name: 'bookmark_name',
            sort_order: 0,
            link_url: 'https://example.com',
            image_url: 'https://example.com/favicon.ico',
            type: 'link',
        } as ChannelBookmark;
        const expectedUrl = client.getChannelBookmarksRoute(channelId);
        const expectedOptions = {
            method: 'post',
            body: {
                channel_id: channelId,
                display_name: bookmark.display_name,
                image_url: bookmark.image_url,
                link_url: bookmark.link_url,
                type: bookmark.type,
            },
            headers: {'Connection-Id': ''},
        };

        await client.createChannelBookmark(channelId, bookmark);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('createChannelBookmark omits an invalid image URL', async () => {
        const bookmark = {
            channel_id: 'channel_id',
            display_name: 'bookmark_name',
            image_url: 'data:image/png;base64,image',
            link_url: 'https://example.com',
            type: 'link',
        } as ChannelBookmark;

        await client.createChannelBookmark(bookmark.channel_id, bookmark);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getChannelBookmarksRoute(bookmark.channel_id),
            expect.objectContaining({
                body: {
                    channel_id: bookmark.channel_id,
                    display_name: bookmark.display_name,
                    link_url: bookmark.link_url,
                    type: bookmark.type,
                },
            }),
        );
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
