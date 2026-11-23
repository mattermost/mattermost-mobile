// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {removePost} from '@actions/local/post';
import {retryFailedPost} from '@actions/remote/post';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Preferences} from '@constants';
import {STATUS_BAR_HEIGHT} from '@constants/view';
import {HANDLE_HEIGHT} from '@screens/bottom_sheet';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Failed from './index';

jest.mock('@actions/local/post', () => ({
    removePost: jest.fn(),
}));

jest.mock('@actions/remote/post', () => ({
    retryFailedPost: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://server.example.com'),
}));

describe('Failed', () => {
    const post = TestHelper.fakePostModel({id: 'post1'});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should open the options sheet tall enough for the handle, top padding and both options', () => {
        const {getByTestId} = renderWithIntl(
            <Failed
                post={post}
                theme={Preferences.THEMES.denim}
            />,
        );

        fireEvent.press(getByTestId('post.failed.button'));

        expect(bottomSheet).toHaveBeenCalledTimes(1);
        const snapPoints = jest.mocked(bottomSheet).mock.calls[0][1];
        expect(snapPoints).toEqual([1, HANDLE_HEIGHT + STATUS_BAR_HEIGHT + (2 * ITEM_HEIGHT)]);
    });

    it('should retry or delete the failed post from the options sheet', () => {
        const {getByTestId} = renderWithIntl(
            <Failed
                post={post}
                theme={Preferences.THEMES.denim}
            />,
        );

        fireEvent.press(getByTestId('post.failed.button'));
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0] as () => React.ReactElement;
        const {getByText} = renderWithIntl(renderContent());

        fireEvent.press(getByText('Try Again'));
        expect(retryFailedPost).toHaveBeenCalledWith('https://server.example.com', post);

        fireEvent.press(getByText('Delete Message'));
        expect(removePost).toHaveBeenCalledWith('https://server.example.com', post);
    });
});
