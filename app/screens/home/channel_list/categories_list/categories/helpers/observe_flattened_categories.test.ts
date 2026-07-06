// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import {UNREADS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {filterAndSortMyChannels, makeChannelsMap} from '@helpers/database';
import {getChannelById, observeChannelsByLastPostAt, observeNotifyPropsByChannels, queryMyChannelUnreads} from '@queries/servers/channel';
import {observeLastUnreadChannelId} from '@queries/servers/system';
import TestHelper from '@test/test_helper';

import {observeCategoryItems, observeFlattenedUnreads} from './observe_flattened_categories';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/system');
jest.mock('@helpers/database');

// Do NOT mock @queries/servers/categories — observeCategoryItems uses it with a real DB

function fakeQuery<T>(items: T[]) {
    return {
        observeWithColumns: jest.fn().mockReturnValue(of$(items)),
        observe: jest.fn().mockReturnValue(of$(items)),
    };
}

function channelsRecord(channels: ChannelModel[]): Record<string, ChannelModel> {
    return channels.reduce<Record<string, ChannelModel>>((acc, c) => {
        acc[c.id] = c;
        return acc;
    }, {});
}

const mockDatabase = {} as Database;

describe('observeFlattenedUnreads', () => {
    const teamId = 'team1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should emit empty items when there are no unread channels', () => {
        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([]));
        jest.mocked(makeChannelsMap).mockReturnValue({});
        jest.mocked(filterAndSortMyChannels).mockReturnValue([]);

        const emitted: Array<{items: unknown[]; unreadChannelIds: Set<string>}> = [];
        const sub = observeFlattenedUnreads(mockDatabase, teamId, false).subscribe((v) => emitted.push(v));

        expect(emitted).toHaveLength(1);
        expect(emitted[0].items).toHaveLength(0);
        expect(emitted[0].unreadChannelIds.size).toBe(0);
        sub.unsubscribe();
    });

    it('should map unread channels to channel FlattenedItems with UNREADS_CATEGORY', () => {
        const channel = TestHelper.fakeChannelModel({id: 'ch1', teamId});
        const myChannel = TestHelper.fakeChannelMembershipModel({channelId: 'ch1'});

        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([myChannel]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([channel]));
        jest.mocked(makeChannelsMap).mockReturnValue(channelsRecord([channel]));
        jest.mocked(filterAndSortMyChannels).mockReturnValue([channel]);

        const emitted: Array<{items: Array<{type: string; categoryId?: string; channelId?: string}>; unreadChannelIds: Set<string>}> = [];
        const sub = observeFlattenedUnreads(mockDatabase, teamId, false).subscribe((v) => emitted.push(v));

        expect(emitted[0].items).toHaveLength(1);
        const item = emitted[0].items[0];
        expect(item.type).toBe('channel');
        expect(item.categoryId).toBe(UNREADS_CATEGORY);
        expect(item.channelId).toBe('ch1');
        expect(emitted[0].unreadChannelIds.has('ch1')).toBe(true);
        sub.unsubscribe();
    });

    it('should populate unreadChannelIds for every channel item', () => {
        const ch1 = TestHelper.fakeChannelModel({id: 'ch1', teamId});
        const ch2 = TestHelper.fakeChannelModel({id: 'ch2', teamId});

        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([ch1, ch2]));
        jest.mocked(makeChannelsMap).mockReturnValue(channelsRecord([ch1, ch2]));
        jest.mocked(filterAndSortMyChannels).mockReturnValue([ch1, ch2]);

        const emitted: Array<{items: unknown[]; unreadChannelIds: Set<string>}> = [];
        const sub = observeFlattenedUnreads(mockDatabase, teamId, false).subscribe((v) => emitted.push(v));

        expect(emitted[0].unreadChannelIds.has('ch1')).toBe(true);
        expect(emitted[0].unreadChannelIds.has('ch2')).toBe(true);
        sub.unsubscribe();
    });

    it('should not invoke observeLastUnreadChannelId when isTablet=false', () => {
        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([]));
        jest.mocked(makeChannelsMap).mockReturnValue({});
        jest.mocked(filterAndSortMyChannels).mockReturnValue([]);

        observeFlattenedUnreads(mockDatabase, teamId, false).subscribe(() => {}).unsubscribe();

        expect(observeLastUnreadChannelId).not.toHaveBeenCalled();
    });

    it('should prepend lastUnreadChannel at the front on tablet', async () => {
        const ch1 = TestHelper.fakeChannelModel({id: 'ch1', teamId});
        const ch2 = TestHelper.fakeChannelModel({id: 'ch2', teamId});

        jest.mocked(observeLastUnreadChannelId).mockReturnValue(of$('ch2'));
        jest.mocked(getChannelById).mockResolvedValue(ch2 as never);
        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([ch1]));
        jest.mocked(makeChannelsMap).mockReturnValue(channelsRecord([ch1]));
        jest.mocked(filterAndSortMyChannels).mockReturnValue([ch1]);

        const emitted: Array<{items: Array<{type: string; channelId?: string}>}> = [];
        const sub = observeFlattenedUnreads(mockDatabase, teamId, true).subscribe((v) => emitted.push(v));

        // getChannelById is a Promise inside switchMap — flush microtasks so it resolves
        await Promise.resolve();
        await Promise.resolve();

        const lastEmit = emitted[emitted.length - 1];
        const channelIds = lastEmit.items.filter((i) => i.type === 'channel').map((i) => i.channelId);
        expect(channelIds[0]).toBe('ch2');
        expect(channelIds[1]).toBe('ch1');
        sub.unsubscribe();
    });

    it('should remove lastUnreadChannel from sorted list to avoid duplication on tablet', async () => {
        const ch1 = TestHelper.fakeChannelModel({id: 'ch1', teamId});
        const ch2 = TestHelper.fakeChannelModel({id: 'ch2', teamId});

        jest.mocked(observeLastUnreadChannelId).mockReturnValue(of$('ch1'));
        jest.mocked(getChannelById).mockResolvedValue(ch1 as never);
        jest.mocked(queryMyChannelUnreads).mockReturnValue(fakeQuery([]) as never);
        jest.mocked(observeNotifyPropsByChannels).mockReturnValue(of$({}));
        jest.mocked(observeChannelsByLastPostAt).mockReturnValue(of$([ch1, ch2]));
        jest.mocked(makeChannelsMap).mockReturnValue(channelsRecord([ch1, ch2]));
        jest.mocked(filterAndSortMyChannels).mockReturnValue([ch1, ch2]);

        const emitted: Array<{items: Array<{type: string; channelId?: string}>}> = [];
        const sub = observeFlattenedUnreads(mockDatabase, teamId, true).subscribe((v) => emitted.push(v));

        // getChannelById is a Promise inside switchMap — flush microtasks so it resolves
        await Promise.resolve();
        await Promise.resolve();

        const lastEmit = emitted[emitted.length - 1];
        const channelIds = lastEmit.items.filter((i) => i.type === 'channel').map((i) => i.channelId);
        expect(channelIds.filter((id) => id === 'ch1')).toHaveLength(1);
        expect(channelIds[0]).toBe('ch1');
        sub.unsubscribe();
    });
});

describe('observeCategoryItems', () => {
    const serverUrl = 'http://obs-cat-items-test.com';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should emit empty items when no categories exist for the team', () => {
        const emitted: Array<{items: unknown[]}> = [];
        const sub = observeCategoryItems(database, teamId).subscribe((v) => emitted.push(v));

        expect(emitted[emitted.length - 1].items).toHaveLength(0);
        sub.unsubscribe();
    });

    it('should emit one category item per category', async () => {
        const cat = TestHelper.fakeCategoryWithId(teamId);
        await operator.handleCategories({categories: [cat], prepareRecordsOnly: false});

        const emitted: Array<{items: Array<{type: string}>}> = [];
        const sub = observeCategoryItems(database, teamId).subscribe((v) => emitted.push(v));

        const lastEmit = emitted[emitted.length - 1];
        expect(lastEmit.items).toHaveLength(1);
        expect(lastEmit.items[0].type).toBe('category');
        sub.unsubscribe();
    });

    it('should include channel ids in the category membership', async () => {
        const channelId = TestHelper.generateId();
        const cat = TestHelper.fakeCategoryWithId(teamId);
        await operator.handleCategories({categories: [cat], prepareRecordsOnly: false});
        await operator.handleCategoryChannels({
            categoryChannels: [TestHelper.fakeCategoryChannelWithId(teamId, cat.id, channelId)],
            prepareRecordsOnly: false,
        });

        const emitted: Array<{items: Array<{type: string; membership?: {channelIds: string[]}}>}> = [];
        const sub = observeCategoryItems(database, teamId).subscribe((v) => emitted.push(v));

        const item = emitted[emitted.length - 1].items[0];
        expect(item.type).toBe('category');
        expect(item.membership?.channelIds).toContain(channelId);
        sub.unsubscribe();
    });

    it('should always return empty unreadChannelIds', async () => {
        const cat = TestHelper.fakeCategoryWithId(teamId);
        await operator.handleCategories({categories: [cat], prepareRecordsOnly: false});

        const emitted: Array<{unreadChannelIds: Set<string>}> = [];
        const sub = observeCategoryItems(database, teamId).subscribe((v) => emitted.push(v));

        expect(emitted[emitted.length - 1].unreadChannelIds.size).toBe(0);
        sub.unsubscribe();
    });
});
