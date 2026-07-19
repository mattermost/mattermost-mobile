// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DMS_CATEGORY} from '@constants/categories';
import TestHelper from '@test/test_helper';

import {computeSortedCategoryChannels} from './compute_sorted_category_channels';

import type {SharedData} from '../category';

const fakeSharedData = (overwrite?: Partial<SharedData>): SharedData => ({
    notifyProps: {},
    manuallyClosedPrefs: [],
    autoclosePrefs: [],
    deactivatedUsers: undefined,
    dmsLimit: 10,
    currentChannelId: '',
    lastUnreadId: undefined,
    unreadsOnTop: false,
    ...overwrite,
});

describe('computeSortedCategoryChannels', () => {
    it('sorts channels alphabetically and excludes managed channel ids', () => {
        const category = TestHelper.fakeCategoryModel({type: 'custom'});
        const channelA = TestHelper.fakeChannelModel({id: 'a', displayName: 'Alpha'});
        const channelB = TestHelper.fakeChannelModel({id: 'b', displayName: 'Beta'});
        const channelC = TestHelper.fakeChannelModel({id: 'c', displayName: 'Gamma'});
        const myChannels = [
            TestHelper.fakeMyChannelModel({id: 'a'}),
            TestHelper.fakeMyChannelModel({id: 'b'}),
            TestHelper.fakeMyChannelModel({id: 'c'}),
        ];

        const {sortedChannels} = computeSortedCategoryChannels(
            category, 'me', 'en', 'alpha', new Map(), new Set(['c']),
            myChannels, [channelA, channelB, channelC], fakeSharedData(),
        );

        expect(sortedChannels.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('reports unread channel ids based on mentions and unread state', () => {
        const category = TestHelper.fakeCategoryModel({type: 'custom'});
        const channelA = TestHelper.fakeChannelModel({id: 'a', displayName: 'Alpha'});
        const channelB = TestHelper.fakeChannelModel({id: 'b', displayName: 'Beta'});
        const myChannels = [
            TestHelper.fakeMyChannelModel({id: 'a', isUnread: true}),
            TestHelper.fakeMyChannelModel({id: 'b', isUnread: false}),
        ];

        const {unreadIds} = computeSortedCategoryChannels(
            category, 'me', 'en', 'alpha', new Map(), new Set(),
            myChannels, [channelA, channelB], fakeSharedData(),
        );

        expect(unreadIds.has('a')).toBe(true);
        expect(unreadIds.has('b')).toBe(false);
    });

    describe('unreadsOnTop exclusion', () => {
        it('excludes unread channels from sortedChannels when unreadsOnTop is true', () => {
            const category = TestHelper.fakeCategoryModel({type: 'custom'});
            const unreadChannel = TestHelper.fakeChannelModel({id: 'unread', displayName: 'Unread Channel'});
            const readChannel = TestHelper.fakeChannelModel({id: 'read', displayName: 'Read Channel'});
            const myChannels = [
                TestHelper.fakeMyChannelModel({id: 'unread', isUnread: true}),
                TestHelper.fakeMyChannelModel({id: 'read', isUnread: false}),
            ];

            const {sortedChannels, unreadIds} = computeSortedCategoryChannels(
                category, 'me', 'en', 'alpha', new Map(), new Set(),
                myChannels, [unreadChannel, readChannel], fakeSharedData({unreadsOnTop: true}),
            );

            // The unread channel is already shown in the cross-category rollup at the top of the list.
            expect(sortedChannels.map((c) => c.id)).toEqual(['read']);

            // unreadIds still reports the full unread set, independent of the exclusion — the collapsed-category
            // logic in category.tsx relies on this to intersect against sortedChannels, not to know unread state itself.
            expect(unreadIds.has('unread')).toBe(true);
        });

        it('keeps unread channels in sortedChannels when unreadsOnTop is false', () => {
            const category = TestHelper.fakeCategoryModel({type: 'custom'});
            const unreadChannel = TestHelper.fakeChannelModel({id: 'unread', displayName: 'Unread Channel'});
            const readChannel = TestHelper.fakeChannelModel({id: 'read', displayName: 'Read Channel'});
            const myChannels = [
                TestHelper.fakeMyChannelModel({id: 'unread', isUnread: true}),
                TestHelper.fakeMyChannelModel({id: 'read', isUnread: false}),
            ];

            const {sortedChannels} = computeSortedCategoryChannels(
                category, 'me', 'en', 'alpha', new Map(), new Set(),
                myChannels, [unreadChannel, readChannel], fakeSharedData({unreadsOnTop: false}),
            );

            expect(sortedChannels.map((c) => c.id).sort()).toEqual(['read', 'unread']);
        });

        it('does not exclude anything when there are no unread channels', () => {
            const category = TestHelper.fakeCategoryModel({type: 'custom'});
            const channelA = TestHelper.fakeChannelModel({id: 'a', displayName: 'Alpha'});
            const channelB = TestHelper.fakeChannelModel({id: 'b', displayName: 'Beta'});
            const myChannels = [
                TestHelper.fakeMyChannelModel({id: 'a', isUnread: false}),
                TestHelper.fakeMyChannelModel({id: 'b', isUnread: false}),
            ];

            const {sortedChannels} = computeSortedCategoryChannels(
                category, 'me', 'en', 'alpha', new Map(), new Set(),
                myChannels, [channelA, channelB], fakeSharedData({unreadsOnTop: true}),
            );

            expect(sortedChannels.map((c) => c.id)).toEqual(['a', 'b']);
        });
    });

    it('applies the DMS_CATEGORY dmsLimit only for the direct messages category', () => {
        const category = TestHelper.fakeCategoryModel({type: DMS_CATEGORY});
        const channels = [
            TestHelper.fakeChannelModel({id: 'dm1', displayName: 'DM 1', type: 'D'}),
            TestHelper.fakeChannelModel({id: 'dm2', displayName: 'DM 2', type: 'D'}),
        ];
        const myChannels = [
            TestHelper.fakeMyChannelModel({id: 'dm1', isUnread: true}),
            TestHelper.fakeMyChannelModel({id: 'dm2', isUnread: true}),
        ];

        const {sortedChannels} = computeSortedCategoryChannels(
            category, 'me', 'en', 'alpha', new Map(), new Set(),
            myChannels, channels, fakeSharedData({dmsLimit: 1}),
        );

        // Both are unread, so filterAutoclosedDMs's unread-always-visible rule keeps both despite the limit of 1.
        expect(sortedChannels).toHaveLength(2);
    });
});
