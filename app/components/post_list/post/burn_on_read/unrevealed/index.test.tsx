// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React, {act} from 'react';

import {deletePost, revealBoRPost} from '@actions/remote/post';
import {BOR_POST_EXPIRED_FOR_USER_ERROR_CODE} from '@components/post_list/post/burn_on_read/unrevealed/constants';
import {PostModel} from '@database/models/server';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {showBoRPostExpiredSnackbar} from '@utils/snack_bar';

import UnrevealedBurnOnReadPost from '.';

jest.mock('@actions/remote/post', () => ({
    revealBoRPost: jest.fn(),
    deletePost: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showBoRPostExpiredSnackbar: jest.fn(),
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
            await TestHelper.wait(0);
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
            await TestHelper.wait(0);
        });

        expect(deletePost).not.toHaveBeenCalled();
        expect(showBoRPostExpiredSnackbar).not.toHaveBeenCalled();
    });

    test('should handle 400 error by showing snackbar and deleting post', async () => {
        const error = {status_code: 400, server_error_id: BOR_POST_EXPIRED_FOR_USER_ERROR_CODE, message: 'Post has expired'};
        jest.mocked(revealBoRPost).mockResolvedValue({error});

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(showBoRPostExpiredSnackbar).toHaveBeenCalledWith('Post has expired');
        expect(deletePost).toHaveBeenCalledWith('', mockPost);
    });

    test('should handle non-400 error without deleting post', async () => {
        const error = {status_code: 500, message: 'Unexpected server error'};
        jest.mocked(revealBoRPost).mockResolvedValue({error});

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(deletePost).not.toHaveBeenCalled();
        expect(showBoRPostExpiredSnackbar).toHaveBeenCalledWith('Unexpected server error');
    });
});
