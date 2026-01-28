// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage} from 'expo-image';
import {Platform} from 'react-native';

import {logDebug} from '@utils/log';

import {prefetchCustomEmojiImages} from './prefetch';

import type {Client} from '@client/rest';

jest.mock('expo-image', () => ({
    Image: {
        prefetch: jest.fn(),
    },
}));

jest.mock('@utils/log');

describe('prefetchCustomEmojiImages', () => {
    const mockClient = {
        apiClient: {
            baseUrl: 'https://example.com',
        },
        getCustomEmojiImageUrl: jest.fn((id) => `url/${id}`),
    } as unknown as Client;

    const emojis = [
        {id: 'emoji1', name: 'emoji_name1'},
        {id: 'emoji2', name: 'emoji_name2'},
    ] as CustomEmoji[];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should prefetch custom emoji images on iOS', () => {
        Platform.OS = 'ios';

        prefetchCustomEmojiImages(mockClient, emojis);

        expect(logDebug).toHaveBeenCalledWith('Prefetching 2 custom emoji images');
        expect(ExpoImage.prefetch).toHaveBeenCalledWith(['url/emoji1', 'url/emoji2'], {cachePolicy: 'disk'});
    });
});
