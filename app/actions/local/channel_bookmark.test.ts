// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {
    handleBookmarkAddedOrDeleted,
    handleBookmarkEdited,
    handleBookmarkSorted,
} from './channel_bookmark';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Model} from '@nozbe/watermelondb';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

let mockGenerateId: jest.Mock;
jest.mock('@utils/general', () => {
    const original = jest.requireActual('@utils/general');
    mockGenerateId = jest.fn(() => 'testpostid');
    return {
        ...original,
        generateId: mockGenerateId,
    };
});

const channelId = 'channelid1';
const bookmark = {
    channel_id: channelId,
    id: 'bookmarkid',
    owner_id: 'userid1',
    type: 'link',
    sort_order: 0,
} as ChannelBookmark;
const channel: Channel = {
    id: channelId,
    team_id: 'teamid',
    total_msg_count: 0,
} as Channel;
const channelMember: ChannelMembership = {
    id: 'id',
    channel_id: channelId,
    user_id: 'userid1',
    msg_count: 0,
} as ChannelMembership;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handleBookmarks', () => {
    it('handleBookmarkAddedOrDeleted - handle not found database', async () => {
        const {error} = await handleBookmarkAddedOrDeleted('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleBookmarkAddedOrDeleted - no channel', async () => {
        const {models} = await handleBookmarkAddedOrDeleted(serverUrl, {data: {bookmark: JSON.stringify(bookmark)}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleBookmarkAddedOrDeleted - base case', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const {models} = await handleBookmarkAddedOrDeleted(serverUrl, {data: {bookmark: JSON.stringify(bookmark)}} as WebSocketMessage) as {models: Model[]};
        expect(models).toBeDefined();
        expect(models?.length).toBe(1); // channel bookmark
    });

    it('handleBookmarkEdited - handle not found database', async () => {
        const {error} = await handleBookmarkEdited('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleBookmarkEdited - no channel', async () => {
        const bookmarkResponse = {updated: bookmark, deleted: {...bookmark, id: 'bookmarkid2'}} as UpdateChannelBookmarkResponse;
        const {models} = await handleBookmarkEdited(serverUrl, {data: {bookmarks: JSON.stringify(bookmarkResponse)}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleBookmarkEdited - base case', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const bookmarkResponse = {updated: bookmark, deleted: {...bookmark, id: 'bookmarkid2', sort_order: 1}} as UpdateChannelBookmarkResponse;

        const {models} = await handleBookmarkEdited(serverUrl, {data: {bookmarks: JSON.stringify(bookmarkResponse)}} as WebSocketMessage) as {models: Model[]};
        expect(models).toBeDefined();
        expect(models?.length).toBe(2); // 2 channel bookmarks
    });

    it('handleBookmarkSorted - handle not found database', async () => {
        const {error} = await handleBookmarkSorted('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleBookmarkSorted - no channel', async () => {
        const bookmarks = [bookmark, {...bookmark, id: 'bookmarkid2', sort_order: 1}];
        const {models} = await handleBookmarkSorted(serverUrl, {data: {bookmarks: JSON.stringify(bookmarks)}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleBookmarkSorted - no bookmarks', async () => {
        const {models} = await handleBookmarkSorted(serverUrl, {data: {bookmarks: JSON.stringify([])}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleBookmarkSorted - base case', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const bookmarks = [bookmark, {...bookmark, id: 'bookmarkid2', sort_order: 1}];

        const {models} = await handleBookmarkSorted(serverUrl, {data: {bookmarks: JSON.stringify(bookmarks)}} as WebSocketMessage) as {models: Model[]};
        expect(models).toBeDefined();
        expect(models?.length).toBe(2); // 2 channel bookmarks
    });
});
