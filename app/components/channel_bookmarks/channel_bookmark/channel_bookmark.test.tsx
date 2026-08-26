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
