// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList} from '@shopify/flash-list';
import React from 'react';

import {fetchCustomEmojis} from '@actions/remote/custom_emoji';
import {EMOJIS_PER_PAGE} from '@constants/emoji';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EmojiSectionList from './index';

import type {CustomEmojiModel} from '@database/models/server';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/custom_emoji', () => ({
    fetchCustomEmojis: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
    useBottomSheetScrollableCreator: jest.fn().mockReturnValue(
        (props: object) => {
            const {View} = require('react-native');
            return <View {...props}/>;
        },
    ),
}));

const makeEmojis = (count: number, prefix: string): CustomEmoji[] => Array.from({length: count}, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix}${i}`,
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    creator_id: 'creator',
}));

describe('EmojiSectionList', () => {
    const serverUrl = 'https://server.com';
    let database: Database;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const renderList = async (customEmojis: CustomEmoji[]) => {
        const list = renderWithEverything(
            <EmojiSectionList
                customEmojis={customEmojis as unknown as CustomEmojiModel[]}
                customEmojisEnabled={true}
                onEmojiPress={jest.fn()}
                recentEmojis={[]}
            />,
            {database},
        );

        // Let FlashList settle its initial layout state
        await act(async () => {
            await TestHelper.wait(0);
        });
        return list;
    };

    const reachEnd = async (list: Awaited<ReturnType<typeof renderList>>) => {
        await act(async () => {
            // eslint-disable-next-line new-cap
            await list.UNSAFE_getByType(FlashList).props.onEndReached();
        });
    };

    it('should fetch the first page even when some custom emojis are already stored locally', async () => {
        jest.mocked(fetchCustomEmojis).mockResolvedValue({data: []});

        // Emojis stored from posts, reactions or searches, not from paging through the list
        const list = await renderList(makeEmojis(5, 'seen_'));
        await reachEnd(list);

        expect(fetchCustomEmojis).toHaveBeenCalledTimes(1);
        expect(fetchCustomEmojis).toHaveBeenCalledWith(expect.any(String), 0, EMOJIS_PER_PAGE);
    });

    it('should keep fetching pages until the server returns no more custom emojis', async () => {
        jest.mocked(fetchCustomEmojis).
            mockResolvedValueOnce({data: makeEmojis(EMOJIS_PER_PAGE, 'a_')}).
            mockResolvedValueOnce({data: makeEmojis(10, 'b_')}).
            mockResolvedValueOnce({data: []});

        const list = await renderList([]);
        await reachEnd(list);
        await reachEnd(list);
        await reachEnd(list);
        await reachEnd(list);

        expect(jest.mocked(fetchCustomEmojis).mock.calls.map(([, page]) => page)).toEqual([0, 1, 2]);
    });
});
