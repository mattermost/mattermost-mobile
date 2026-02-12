// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UNREADS_CATEGORY} from '@constants/categories';
import TestHelper from '@test/test_helper';

import {keyExtractor, getItemType, flattenCategories, type CategoryData, type FlattenedItem} from './flatten_categories';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

describe('flatten_categories utils', () => {
    // Create mock categories using TestHelper
    const mockCategory1: CategoryModel = TestHelper.fakeCategoryModel({
        id: 'cat1',
        collapsed: false,
    });

    const mockCategory2: CategoryModel = TestHelper.fakeCategoryModel({
        id: 'cat2',
        collapsed: true,
    });

    // Create mock channels using TestHelper
    const mockChannel1: ChannelModel = TestHelper.fakeChannelModel({id: 'channel1'});
    const mockChannel2: ChannelModel = TestHelper.fakeChannelModel({id: 'channel2'});
    const mockChannel3: ChannelModel = TestHelper.fakeChannelModel({id: 'channel3'});

    describe('keyExtractor', () => {
        it('should return "unreads_header" for unreads_header type', () => {
            const item: FlattenedItem = {type: 'unreads_header'};
            expect(keyExtractor(item)).toBe('unreads_header');
        });

        it('should return "h:{categoryId}" for header type', () => {
            const item: FlattenedItem = {
                type: 'header',
                categoryId: 'cat1',
                category: mockCategory1,
            };
            expect(keyExtractor(item)).toBe('h:cat1');
        });

        it('should return "c:{channelId}" for channel type', () => {
            const item: FlattenedItem = {
                type: 'channel',
                categoryId: 'cat1',
                categoryType: 'custom',
                channelId: 'channel1',
                channel: mockChannel1,
            };
            expect(keyExtractor(item)).toBe('c:channel1');
        });
    });

    describe('getItemType', () => {
        it('should return "unreads_header" for unreads_header item', () => {
            const item: FlattenedItem = {type: 'unreads_header'};
            expect(getItemType(item)).toBe('unreads_header');
        });

        it('should return "header" for header item', () => {
            const item: FlattenedItem = {
                type: 'header',
                categoryId: 'cat1',
                category: mockCategory1,
            };
            expect(getItemType(item)).toBe('header');
        });

        it('should return "channel" for channel item', () => {
            const item: FlattenedItem = {
                type: 'channel',
                categoryId: 'cat1',
                categoryType: 'custom',
                channelId: 'channel1',
                channel: mockChannel1,
            };
            expect(getItemType(item)).toBe('channel');
        });
    });

    describe('flattenCategories', () => {
        describe('without unreadsOnTop', () => {
            it('should flatten categories with headers and channels', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory1,
                    sortedChannels: [mockChannel1, mockChannel2],
                    unreadIds: new Set(['channel1']),
                    allUnreadChannels: [mockChannel1],
                }];

                const result = flattenCategories(categoriesData, false);

                expect(result).toHaveLength(3); // 1 header + 2 channels
                expect(result[0].type).toBe('header');
                expect(result[1].type).toBe('channel');
                expect(result[2].type).toBe('channel');

                const headerItem = result[0] as Extract<FlattenedItem, {type: 'header'}>;
                expect(headerItem.categoryId).toBe('cat1');

                const channelItem1 = result[1] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(channelItem1.channelId).toBe('channel1');
                expect(channelItem1.categoryId).toBe('cat1');

                const channelItem2 = result[2] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(channelItem2.channelId).toBe('channel2');
                expect(channelItem2.categoryId).toBe('cat1');
            });

            it('should respect collapsed state - showing only unread channels', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory2, // collapsed = true
                    sortedChannels: [mockChannel1, mockChannel2, mockChannel3],
                    unreadIds: new Set(['channel1', 'channel3']),
                    allUnreadChannels: [mockChannel1, mockChannel3],
                }];

                const result = flattenCategories(categoriesData, false);

                expect(result).toHaveLength(3); // 1 header + 2 unread channels only
                expect(result[0].type).toBe('header');
                expect(result[1].type).toBe('channel');
                expect(result[2].type).toBe('channel');

                const channelItem1 = result[1] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(channelItem1.channelId).toBe('channel1');

                const channelItem2 = result[2] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(channelItem2.channelId).toBe('channel3');
            });

            it('should handle empty categories', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory1,
                    sortedChannels: [],
                    unreadIds: new Set(),
                    allUnreadChannels: [],
                }];

                const result = flattenCategories(categoriesData, false);

                expect(result).toHaveLength(1); // Only header
                expect(result[0].type).toBe('header');
            });

            it('should handle multiple categories', () => {
                const categoriesData: CategoryData[] = [
                    {
                        category: mockCategory1,
                        sortedChannels: [mockChannel1],
                        unreadIds: new Set(),
                        allUnreadChannels: [],
                    },
                    {
                        category: mockCategory2,
                        sortedChannels: [mockChannel2],
                        unreadIds: new Set(['channel2']),
                        allUnreadChannels: [mockChannel2],
                    },
                ];

                const result = flattenCategories(categoriesData, false);

                expect(result).toHaveLength(4); // 2 headers + 2 channels
                expect(result[0].type).toBe('header');
                expect(result[1].type).toBe('channel');
                expect(result[2].type).toBe('header');
                expect(result[3].type).toBe('channel');
            });
        });

        describe('with unreadsOnTop', () => {
            it('should create unreads_header and add all unread channels', () => {
                const categoriesData: CategoryData[] = [
                    {
                        category: mockCategory1,
                        sortedChannels: [mockChannel1, mockChannel2],
                        unreadIds: new Set(['channel1']),
                        allUnreadChannels: [mockChannel1],
                    },
                    {
                        category: mockCategory2,
                        sortedChannels: [mockChannel3],
                        unreadIds: new Set(['channel3']),
                        allUnreadChannels: [mockChannel3],
                    },
                ];

                const result = flattenCategories(categoriesData, true);

                // unreads_header + 2 unread channels + 2 category headers + remaining channels
                expect(result[0].type).toBe('unreads_header');
                expect(result[1].type).toBe('channel');
                expect(result[2].type).toBe('channel');

                const unreadChannel1 = result[1] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(unreadChannel1.channelId).toBe('channel1');
                expect(unreadChannel1.categoryId).toBe(UNREADS_CATEGORY);

                const unreadChannel2 = result[2] as Extract<FlattenedItem, {type: 'channel'}>;
                expect(unreadChannel2.channelId).toBe('channel3');
                expect(unreadChannel2.categoryId).toBe(UNREADS_CATEGORY);
            });

            it('should deduplicate unread channels across categories', () => {
                const categoriesData: CategoryData[] = [
                    {
                        category: mockCategory1,
                        sortedChannels: [mockChannel1],
                        unreadIds: new Set(['channel1']),
                        allUnreadChannels: [mockChannel1],
                    },
                    {
                        category: mockCategory2,
                        sortedChannels: [mockChannel1], // Same channel in different category
                        unreadIds: new Set(['channel1']),
                        allUnreadChannels: [mockChannel1],
                    },
                ];

                const result = flattenCategories(categoriesData, true);

                // Count how many times channel1 appears in unreads section
                const unreadsSection = result.slice(0, result.findIndex((item) => item.type === 'header'));
                const channel1Count = unreadsSection.filter(
                    (item) => item.type === 'channel' && (item as any).channelId === 'channel1',
                ).length;

                expect(channel1Count).toBe(1); // Should only appear once
            });

            it('should not add unreads_header when no unreads exist', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory1,
                    sortedChannels: [mockChannel1],
                    unreadIds: new Set(),
                    allUnreadChannels: [],
                }];

                const result = flattenCategories(categoriesData, true);

                expect(result[0].type).toBe('header'); // Should start with category header, not unreads_header
                expect(result.find((item) => item.type === 'unreads_header')).toBeUndefined();
            });

            it('should still show category headers and channels below unreads', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory1,
                    sortedChannels: [mockChannel1, mockChannel2],
                    unreadIds: new Set(['channel1']),
                    allUnreadChannels: [mockChannel1],
                }];

                const result = flattenCategories(categoriesData, true);

                // Find category header position
                const categoryHeaderIndex = result.findIndex(
                    (item) => item.type === 'header' && (item as any).categoryId === 'cat1',
                );

                expect(categoryHeaderIndex).toBeGreaterThan(0); // Should exist after unreads section
                expect(result[categoryHeaderIndex].type).toBe('header');
            });

            it('should respect collapsed state in normal categories section', () => {
                const categoriesData: CategoryData[] = [{
                    category: mockCategory2, // collapsed = true
                    sortedChannels: [mockChannel1, mockChannel2],
                    unreadIds: new Set(['channel1']),
                    allUnreadChannels: [mockChannel1],
                }];

                const result = flattenCategories(categoriesData, true);

                // Find category header
                const categoryHeaderIndex = result.findIndex(
                    (item) => item.type === 'header' && (item as any).categoryId === 'cat2',
                );

                // Count channels after category header (before next header or end)
                const channelsAfterHeader = result.slice(categoryHeaderIndex + 1).filter(
                    (item) => item.type === 'channel',
                ).length;

                // Since collapsed and only channel1 is unread, it should show only unread channels
                expect(channelsAfterHeader).toBe(1);
            });
        });
    });
});
