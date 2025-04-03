// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {act, renderWithIntl} from '@test/intl-test-helper';

import BookmarkIcon from './bookmark_icon';

jest.mock('@context/theme', () => ({
    useTheme: () => ({
        centerChannelColor: '#000',
    }),
}));
jest.mock('@components/emoji', () => 'Emoji');

describe('components/channel_bookmarks/channel_bookmark/BookmarkIcon', () => {
    const baseProps = {
        emojiSize: 24,
        iconSize: 22,
        genericStyle: {},
    };

    it('renders default bookmark icon when no specific content provided', () => {
        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...baseProps}/>,
        );

        expect(getByTestId('bookmark-generic-icon')).toBeOnTheScreen();
    });

    it('renders FileIcon when file prop is provided', () => {
        const props = {
            ...baseProps,
            file: {
                id: 'file1',
                name: 'test.pdf',
                extension: 'pdf',
            } as unknown as FileInfo,
        };

        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...props}/>,
        );

        expect(getByTestId('bookmark-file-icon')).toBeOnTheScreen();
    });

    it('renders Image when imageUrl is provided', () => {
        const props = {
            ...baseProps,
            imageUrl: 'https://example.com/image.jpg',
            imageStyle: {width: 40, height: 40},
        };

        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...props}/>,
        );

        expect(getByTestId('bookmark-image')).toBeOnTheScreen();
    });

    it('renders Emoji when emoji prop is provided', () => {
        const props = {
            ...baseProps,
            emoji: 'smile',
            emojiStyle: {fontSize: 20},
        };

        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...props}/>,
        );

        const emojiComponent = getByTestId('bookmark-emoji');
        expect(emojiComponent).toBeOnTheScreen();
        expect(emojiComponent.props.emojiName).toBe('smile');
    });

    it('renders Emoji when emoji prop with `:` is provided', () => {
        const props = {
            ...baseProps,
            emoji: ':computer-rage:',
            emojiStyle: {fontSize: 20},
        };

        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...props}/>,
        );

        const emojiComponent = getByTestId('bookmark-emoji');
        expect(emojiComponent).toBeOnTheScreen();
        expect(emojiComponent.props.emojiName).toBe('computer-rage');
    });

    it('falls back to default icon when image fails to load', () => {
        const props = {
            ...baseProps,
            imageUrl: 'https://example.com/invalid.jpg',
        };

        const {getByTestId} = renderWithIntl(
            <BookmarkIcon {...props}/>,
        );

        const image = getByTestId('bookmark-image');
        const mockErrorEvent = {
            nativeEvent: {
                error: new Error('Image failed to load'),
            },
        };
        act(() => {
            image.props.onError(mockErrorEvent);
        });

        expect(getByTestId('bookmark-generic-icon')).toBeOnTheScreen();
    });
});
