// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {fetchChannelBookmarks, createChannelBookmark, editChannelBookmark, deleteChannelBookmark} from './channel_bookmark';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const channelId = 'channel1';
const bookmarkId = 'bookmark1';

const bookmark1: ChannelBookmark = {
    id: bookmarkId,
    channel_id: channelId,
    create_at: 123,
    update_at: 123,
    delete_at: 0,
    owner_id: 'user1',
    display_name: 'Test Bookmark',
    link_url: 'http://test.com',
    emoji: ':test:',
    sort_order: 0,
    type: 'link',
};

const mockClient = {
    getChannelBookmarksForChannel: jest.fn(() => [bookmark1]),
    createChannelBookmark: jest.fn(() => bookmark1),
    updateChannelBookmark: jest.fn(() => ({updated: bookmark1})),
    deleteChannelBookmark: jest.fn(() => ({deleted: bookmark1})),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

describe('channel bookmarks', () => {
    let bookmarkSpy: jest.SpyInstance;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagChannelBookmarks', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});
        bookmarkSpy = jest.spyOn(operator, 'handleChannelBookmark');
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('fetchChannelBookmarks - handle not found database', async () => {
        const result = await fetchChannelBookmarks('invalid', channelId) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchChannelBookmarks - base case', async () => {
        const result = await fetchChannelBookmarks(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.length).toBe(1);
        expect(result.bookmarks?.[0].id).toBe(bookmark1.id);
        expect(bookmarkSpy).toHaveBeenCalled();
    });

    it('fetchChannelBookmarks - fetch only', async () => {
        const result = await fetchChannelBookmarks(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.length).toBe(1);
        expect(result.bookmarks?.[0].id).toBe(bookmark1.id);
        expect(bookmarkSpy).not.toHaveBeenCalled();
    });

    it('fetchChannelBookmarks - feature flag disabled', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagChannelBookmarks', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        const result = await fetchChannelBookmarks(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.length).toBe(0);
    });

    it('createChannelBookmark - handle not found database', async () => {
        const result = await createChannelBookmark('invalid', channelId, bookmark1) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('createChannelBookmark - base case', async () => {
        const result = await createChannelBookmark(serverUrl, channelId, bookmark1);
        expect(result).toBeDefined();
        expect(result.bookmark).toBeDefined();
        expect(result.bookmark?.id).toBe(bookmark1.id);
        expect(bookmarkSpy).toHaveBeenCalled();
    });

    it('createChannelBookmark - fetch only', async () => {
        const result = await createChannelBookmark(serverUrl, channelId, bookmark1, true);
        expect(result).toBeDefined();
        expect(result.bookmark).toBeDefined();
        expect(result.bookmark?.id).toBe(bookmark1.id);
        expect(bookmarkSpy).not.toHaveBeenCalled();
    });

    it('editChannelBookmark - handle not found database', async () => {
        const result = await editChannelBookmark('invalid', bookmark1) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('editChannelBookmark - base case', async () => {
        const result = await editChannelBookmark(serverUrl, bookmark1);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.updated.id).toBe(bookmark1.id);
        expect(bookmarkSpy).toHaveBeenCalled();
    });

    it('editChannelBookmark - fetch only', async () => {
        const result = await editChannelBookmark(serverUrl, bookmark1, true);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.updated.id).toBe(bookmark1.id);
        expect(bookmarkSpy).not.toHaveBeenCalled();
    });

    it('deleteChannelBookmark - handle not found database', async () => {
        const result = await deleteChannelBookmark('invalid', channelId, bookmarkId) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('deleteChannelBookmark - base case', async () => {
        await operator.handleChannelBookmark({bookmarks: [bookmark1], prepareRecordsOnly: false});
        const result = await deleteChannelBookmark(serverUrl, channelId, bookmarkId);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
    });

    it('should not fetch bookmarks if license is not licensed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'false'}}], prepareRecordsOnly: false});
        const result = await fetchChannelBookmarks(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.bookmarks).toBeDefined();
        expect(result.bookmarks?.length).toBe(0);
        expect(mockClient.getChannelBookmarksForChannel).not.toHaveBeenCalled();
    });
});
