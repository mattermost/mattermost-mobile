// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {keyExtractor, getItemType, type FlattenedItem} from './flattened_item';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

describe('flattened_item utils', () => {
    // Create mock category and channel using TestHelper
    const mockCategory1: CategoryModel = TestHelper.fakeCategoryModel({
        id: 'cat1',
        collapsed: false,
    });

    const mockChannel1: ChannelModel = TestHelper.fakeChannelModel({id: 'channel1'});

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
});
