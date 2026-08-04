// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntl} from '@test/intl-test-helper';

import ChannelBookmark from './channel_bookmark';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

const mockOnPress = jest.fn();

jest.mock('@components/option_item', () => ({
    ITEM_HEIGHT: 48,
}));

// This shadows the fuller mock in test/setup.ts, so it has to keep addListener:
// app/init/managed_app.ts constructs its singleton at import time and calls
// Emm.addListener() there. This file's import graph reaches it transitively
// (queries/servers/channel -> ... -> managers/network_manager -> init/managed_app),
// and without addListener the whole suite fails to run with
// "_reactNativeEmm.default.addListener is not a function".
jest.mock('@mattermost/react-native-emm', () => ({
    addListener: jest.fn(),
    useManagedConfig: () => ({}),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://example.com',
}));

jest.mock('@hooks/gallery', () => ({
    useGalleryItem: (_galleryIdentifier: string, _index: number, onPress: () => void) => ({
        onGestureEvent: onPress,
        ref: {current: null},
    }),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@screens/bottom_sheet', () => ({
    TITLE_HEIGHT: 48,
}));

jest.mock('@utils/file', () => ({
    isDocument: () => false,
}));

jest.mock('@utils/url/links', () => ({
    openLink: jest.fn(),
}));

jest.mock('./bookmark_details', () => 'BookmarkDetails');
jest.mock('./bookmark_document', () => 'BookmarkDocument');
jest.mock('./bookmark_options', () => 'BookmarkOptions');

describe('components/channel_bookmarks/channel_bookmark/ChannelBookmark', () => {
    beforeEach(() => {
        mockOnPress.mockClear();
    });

    it('should invoke the gallery handler when the bookmark test element is pressed', () => {
        const bookmark = {
            id: 'bookmark-id',
            linkUrl: '',
            type: 'file',
        } as ChannelBookmarkModel;
        const {getByTestId} = renderWithIntl(
            <ChannelBookmark
                bookmark={bookmark}
                canDeleteBookmarks={false}
                canDownloadFiles={true}
                canEditBookmarks={false}
                enableSecureFilePreview={false}
                galleryIdentifier='channel-bookmarks'
                index={0}
                onPress={mockOnPress}
                publicLinkEnabled={true}
                siteURL='https://example.com'
            />,
        );

        fireEvent.press(getByTestId('channel_bookmark.bookmark-id'));

        expect(mockOnPress).toHaveBeenCalledWith(0);
    });
});
