// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import Post from '@components/post_list/post';
import {Screens} from '@constants';
import {popTopScreen} from '@screens/navigation';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {getPostTranslation} from '@utils/post';

import ShowTranslation from './show_translation';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@screens/navigation', () => ({
    popTopScreen: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@utils/post', () => ({
    getPostTranslation: jest.fn(),
}));
jest.mock('@components/post_list/post', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Post).mockImplementation((props) =>
    React.createElement('Post', {testID: 'show_translation.post', ...props}),
);

describe('ShowTranslation', () => {
    function getBaseProps(): ComponentProps<typeof ShowTranslation> {
        return {
            componentId: Screens.SHOW_TRANSLATION as AvailableScreens,
            post: undefined,
            appsEnabled: false,
            customEmojiNames: [],
            isCRTEnabled: false,
        };
    }

    const mockTranslation = {
        object: {message: 'Translated text'},
        state: 'ready' as const,
        source_lang: 'en',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getPostTranslation).mockReturnValue(mockTranslation);
    });

    it('returns null when post is not provided', () => {
        const props = getBaseProps();
        const {queryByTestId} = renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        expect(queryByTestId('show_translation.screen')).toBeNull();
    });

    it('renders two Post instances (original and translated)', () => {
        const post = TestHelper.fakePostModel({id: 'post1', channelId: 'channel1'});
        const props = {
            ...getBaseProps(),
            post,
        };
        const {getAllByTestId} = renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        const postComponents = getAllByTestId('show_translation.post');
        expect(postComponents).toHaveLength(2);
    });

    it('passes correct props to Post for original and translated blocks', () => {
        const post = TestHelper.fakePostModel({id: 'post1', channelId: 'channel1'});
        const props = {
            ...getBaseProps(),
            post,
            appsEnabled: true,
            customEmojiNames: ['custom_emoji'],
            isCRTEnabled: true,
        };
        const {getAllByTestId} = renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        const postComponents = getAllByTestId('show_translation.post');
        expect(postComponents).toHaveLength(2);

        const originalPost = postComponents[0];
        expect(originalPost).toHaveProp('post', post);
        expect(originalPost).toHaveProp('location', Screens.SHOW_TRANSLATION);
        expect(originalPost).toHaveProp('isChannelAutotranslated', false);
        expect(originalPost).toHaveProp('appsEnabled', true);
        expect(originalPost).toHaveProp('customEmojiNames', ['custom_emoji']);
        expect(originalPost).toHaveProp('isCRTEnabled', true);
        expect(originalPost).toHaveProp('shouldRenderReplyButton', false);
        expect(originalPost).toHaveProp('showAddReaction', false);

        const translatedPost = postComponents[1];
        expect(translatedPost).toHaveProp('post', post);
        expect(translatedPost).toHaveProp('location', Screens.SHOW_TRANSLATION);
        expect(translatedPost).toHaveProp('isChannelAutotranslated', true);
    });

    it('sets up Android back handler with componentId and close callback', () => {
        const useAndroidHardwareBackHandler = require('@hooks/android_back_handler').default;
        const componentId = Screens.SHOW_TRANSLATION as AvailableScreens;
        const post = TestHelper.fakePostModel({id: 'post1'});
        const props = {
            ...getBaseProps(),
            post,
            componentId,
        };
        renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            componentId,
            expect.any(Function),
        );

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        act(() => {
            closeHandler();
        });
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
    });

    it('displays ORIGINAL and AUTO-TRANSLATED badges when translation is available', () => {
        const post = TestHelper.fakePostModel({id: 'post1'});
        const props = {
            ...getBaseProps(),
            post,
        };
        const {getByText} = renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        expect(getByText('ORIGINAL')).toBeTruthy();
        expect(getByText('AUTO-TRANSLATED')).toBeTruthy();
    });

    it('displays Unknown for language when translation has no source_lang', () => {
        jest.mocked(getPostTranslation).mockReturnValue({
            ...mockTranslation,
            source_lang: undefined,
        });
        const post = TestHelper.fakePostModel({id: 'post1'});
        const props = {
            ...getBaseProps(),
            post,
        };
        const {getByText} = renderWithIntlAndTheme(<ShowTranslation {...props}/>);

        expect(getByText('Unknown')).toBeTruthy();
    });
});
