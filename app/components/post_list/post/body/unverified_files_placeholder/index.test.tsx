// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {BehaviorSubject} from 'rxjs';

import {Screens} from '@constants';
import {useIsInViewPort} from '@hooks/in_viewport';
import RedactionRevalidationManager from '@managers/redaction_revalidation_manager';
import WebsocketManager from '@managers/websocket_manager';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import UnverifiedFilesPlaceholder from './index';

const serverUrl = 'https://server.test.com';

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://server.test.com',
}));
jest.mock('@hooks/in_viewport', () => ({
    useIsInViewPort: jest.fn(() => true),
}));
jest.mock('@managers/redaction_revalidation_manager', () => ({
    __esModule: true,
    default: {
        enqueue: jest.fn(),
        observeRevalidationFailed: jest.fn(),
    },
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        isConnected: jest.fn(),
        observeWebsocketState: jest.fn(),
    },
}));

describe('components/post_list/post/body/unverified_files_placeholder', () => {
    let failed: BehaviorSubject<boolean>;

    const setConnected = (connected: boolean) => {
        jest.mocked(WebsocketManager.isConnected).mockReturnValue(connected);
        jest.mocked(WebsocketManager.observeWebsocketState).mockReturnValue(new BehaviorSubject(connected ? 'connected' : 'not_connected'));
    };

    const renderPlaceholder = () => renderWithIntlAndTheme(
        <UnverifiedFilesPlaceholder
            postId='post1'
            location={Screens.CHANNEL}
            requiredEpoch={3}
        />,
    );

    beforeEach(() => {
        failed = new BehaviorSubject(false);
        jest.mocked(RedactionRevalidationManager.observeRevalidationFailed).mockReturnValue(failed);
        jest.mocked(useIsInViewPort).mockReturnValue(true);
    });

    it('should queue a re-check once on screen and connected, with nothing to retry yet', () => {
        setConnected(true);

        const {getByText, queryByTestId} = renderPlaceholder();

        // The location lets the channel list re-check its posts a page at a time.
        expect(RedactionRevalidationManager.enqueue).toHaveBeenCalledTimes(1);
        expect(RedactionRevalidationManager.enqueue).toHaveBeenCalledWith(serverUrl, 'post1', 3, Screens.CHANNEL);
        expect(getByText('Checking file access')).toBeTruthy();
        expect(queryByTestId('unverified-files-placeholder.retry')).toBeNull();
    });

    it('should not queue a re-check off screen', () => {
        // Revalidating every unverified post would cost a request per cached post.
        setConnected(true);
        jest.mocked(useIsInViewPort).mockReturnValue(false);

        renderPlaceholder();

        expect(RedactionRevalidationManager.enqueue).not.toHaveBeenCalled();
    });

    it('should wait for the server while offline and let the user retry', () => {
        setConnected(false);

        const {getByText, getByTestId} = renderPlaceholder();
        expect(RedactionRevalidationManager.enqueue).not.toHaveBeenCalled();
        expect(getByText('Connect to verify file access')).toBeTruthy();

        fireEvent.press(getByTestId('unverified-files-placeholder.retry'));

        expect(RedactionRevalidationManager.enqueue).toHaveBeenCalledWith(serverUrl, 'post1', 3, Screens.CHANNEL);
    });

    it('should offer a retry when a re-check failed while connected', () => {
        // Nothing else would ask again, so the post would otherwise read "checking" indefinitely.
        setConnected(true);
        failed.next(true);

        const {getByTestId} = renderPlaceholder();

        expect(getByTestId('unverified-files-placeholder.retry')).toBeTruthy();
    });
});
