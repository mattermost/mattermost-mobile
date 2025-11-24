// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React, {act} from 'react';

import {deletePost, revealBoRPost} from '@actions/remote/post';
import {PostModel} from '@database/models/server';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {showBoRPostExpiredSnackbar} from '@utils/snack_bar';

import UnrevealedBurnOnReadPost from './unrevealed_burn_on_read_post';

jest.mock('@actions/remote/post', () => ({
    revealBoRPost: jest.fn(),
    deletePost: jest.fn(),
}));

jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn().mockReturnValue('Error message'),
    isErrorWithStatusCode: jest.fn(),
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
        const error = {status_code: 400};
        jest.mocked(revealBoRPost).mockResolvedValue({error});
        jest.mocked(isErrorWithStatusCode).mockReturnValue(true);
        jest.mocked(getFullErrorMessage).mockReturnValue('Post has expired');

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(isErrorWithStatusCode).toHaveBeenCalledWith(error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(showBoRPostExpiredSnackbar).toHaveBeenCalledWith('Post has expired');
        expect(deletePost).toHaveBeenCalledWith('', mockPost);
    });

    test('should handle non-400 error without deleting post', async () => {
        const error = {status_code: 500};
        jest.mocked(revealBoRPost).mockResolvedValue({error});
        jest.mocked(isErrorWithStatusCode).mockReturnValue(true);

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(deletePost).not.toHaveBeenCalled();
        expect(showBoRPostExpiredSnackbar).not.toHaveBeenCalled();
    });

    test('should handle error that is not status code error', async () => {
        const error = {message: 'Network error'};
        jest.mocked(revealBoRPost).mockResolvedValue({error});
        jest.mocked(isErrorWithStatusCode).mockReturnValue(false);

        renderWithIntlAndTheme(<UnrevealedBurnOnReadPost {...baseProps}/>);

        const button = screen.getByText('View message');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(deletePost).not.toHaveBeenCalled();
        expect(showBoRPostExpiredSnackbar).not.toHaveBeenCalled();
    });
});
