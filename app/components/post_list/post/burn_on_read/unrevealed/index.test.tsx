// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React, {act} from 'react';

import {removePost} from '@actions/local/post';
import {deletePost, revealBoRPost} from '@actions/remote/post';
import {BOR_ERROR_CODES} from '@components/post_list/post/burn_on_read/unrevealed/constants';
import {PostModel} from '@database/models/server';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {showBoRPostErrorSnackbar} from '@utils/snack_bar';

import UnrevealedBurnOnReadPost from '.';

jest.mock('@actions/remote/post', () => ({
    revealBoRPost: jest.fn(),
    deletePost: jest.fn(),
}));

jest.mock('@actions/local/post', () => ({
    removePost: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showBoRPostErrorSnackbar: jest.fn(),
}));

describe('UnrevealedBurnOnReadPost', () => {
    const mockPost = {
        id: 'post_id_123',
    } as PostModel;

    const baseProps = {
        post: mockPost,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render button with correct text and icon', () => {
        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');
        expect(button).toBeVisible();
    });

    test('should call revealBoRPost when button is pressed', async () => {
        jest.mocked(revealBoRPost).mockResolvedValue({error: null});

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
        });

        expect(revealBoRPost).toHaveBeenCalledWith('', 'post_id_123');
        expect(revealBoRPost).toHaveBeenCalledTimes(1);
    });

    test('should handle successful reveal without error', async () => {
        jest.mocked(revealBoRPost).mockResolvedValue({error: null});

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
        });

        expect(deletePost).not.toHaveBeenCalled();
        expect(showBoRPostErrorSnackbar).not.toHaveBeenCalled();
    });

    test('should handle all post reveal errors', async () => {
        for (const errorCode of BOR_ERROR_CODES) {
            // Clearing mocks to ensure each iteration runs with fresh mock state
            jest.clearAllMocks();

            const error = {server_error_id: errorCode, message: `Post unrevealed error for code: ${errorCode}`};
            jest.mocked(revealBoRPost).mockResolvedValueOnce({error});

            renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);
            const button = screen.getByText('View message');

            // eslint-disable-next-line no-await-in-loop
            await act(async () => {
                fireEvent.press(button);
            });

            expect(showBoRPostErrorSnackbar).toHaveBeenCalledWith(`Post unrevealed error for code: ${errorCode}`);
            expect(removePost).toHaveBeenCalledWith('', mockPost);
        }
    });

    test('should handle non-400 error without deleting post', async () => {
        const error = {status_code: 500, message: 'Unexpected server error'};
        jest.mocked(revealBoRPost).mockResolvedValue({error});

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
        });

        expect(removePost).not.toHaveBeenCalled();
        expect(showBoRPostErrorSnackbar).toHaveBeenCalledWith('Unexpected server error');
    });
});
