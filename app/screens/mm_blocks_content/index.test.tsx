// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {MmBlocksContextProvider, type MmBlocksExpandedContentPayload} from '@components/block_renderer/mm_blocks_context_provider';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {act, renderWithIntlAndTheme} from '@test/intl-test-helper';

import MmBlocksContent from './index';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@components/block_renderer/mm_blocks_context_provider', () => ({
    __esModule: true,
    MmBlocksContextProvider: jest.fn(),
}));

jest.mocked(MmBlocksContextProvider).mockImplementation(
    (props) => React.createElement('MmBlocksContextProvider', {testID: 'mm_blocks_content.context_provider', ...props}),
);

function getPayload(overrides: Partial<MmBlocksExpandedContentPayload> = {}): MmBlocksExpandedContentPayload {
    return {
        channelId: 'channel-id',
        location: Screens.CHANNEL,
        postId: 'post-id',
        renderContent: () => React.createElement(Text, {testID: 'mm_blocks_content.rendered'}, 'Expanded content'),
        imagesMetadata: {'https://example.com/a.png': {width: 100, height: 100}},
        inlineMarkdownActions: {mmBlocksActionCookie: 'cookie'},
        ...overrides,
    };
}

describe('MmBlocksContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
    });

    it('should display cannot display content when callback payload is missing', () => {
        const {getByText, queryByTestId} = renderWithIntlAndTheme(<MmBlocksContent/>);

        expect(getByText('Cannot display content')).toBeTruthy();
        expect(queryByTestId('mm_blocks_content.screen')).toBeNull();
    });

    it('should render scrollable content when callback payload is present', () => {
        CallbackStore.setCallback(getPayload());
        const {getByTestId} = renderWithIntlAndTheme(<MmBlocksContent/>);

        expect(getByTestId('mm_blocks_content.screen')).toBeTruthy();
        expect(getByTestId('mm_blocks_content.scroll_view')).toBeTruthy();
        expect(getByTestId('mm_blocks_content.rendered')).toHaveTextContent('Expanded content');
    });

    it('should pass payload context values to MmBlocksContextProvider', () => {
        const payload = getPayload();
        CallbackStore.setCallback(payload);
        const {getByTestId} = renderWithIntlAndTheme(<MmBlocksContent/>);

        const contextProvider = getByTestId('mm_blocks_content.context_provider');
        expect(contextProvider).toHaveProp('channelId', payload.channelId);
        expect(contextProvider).toHaveProp('location', payload.location);
        expect(contextProvider).toHaveProp('postId', payload.postId);
        expect(contextProvider).toHaveProp('imagesMetadata', payload.imagesMetadata);
        expect(contextProvider).toHaveProp('inlineMarkdownActions', payload.inlineMarkdownActions);
        expect(contextProvider).toHaveProp('layoutWidth', undefined);
    });

    it('should remove callback from CallbackStore on unmount', () => {
        CallbackStore.setCallback(getPayload());
        const {unmount} = renderWithIntlAndTheme(<MmBlocksContent/>);

        expect(CallbackStore.getCallback()).toBeDefined();
        unmount();
        expect(CallbackStore.getCallback()).toBeUndefined();
    });

    it('should set up Android back handler with screen id and navigateBack', () => {
        CallbackStore.setCallback(getPayload());
        renderWithIntlAndTheme(<MmBlocksContent/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            Screens.MM_BLOCKS_CONTENT,
            navigateBack,
        );
    });

    it('should update layoutWidth when content layout width is greater than zero', () => {
        CallbackStore.setCallback(getPayload());
        const {getByTestId} = renderWithIntlAndTheme(<MmBlocksContent/>);

        const renderedContent = getByTestId('mm_blocks_content.rendered');
        act(() => {
            fireEvent(renderedContent.parent!, 'layout', {
                nativeEvent: {layout: {width: 320.4, height: 100, x: 0, y: 0}},
            });
        });

        expect(getByTestId('mm_blocks_content.context_provider')).toHaveProp('layoutWidth', 320);
    });
});
