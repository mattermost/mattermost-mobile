// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import SnackBarStore from '@store/snackbar_store';

import {showBoRPostErrorSnackbar, showPlaybookErrorSnackbar} from './index';

jest.mock('@store/snackbar_store', () => ({
    show: jest.fn(),
}));

describe('snack bar', () => {
    describe('showPlaybookErrorSnackbar', () => {
        it('should show snackbar', () => {
            showPlaybookErrorSnackbar();

            expect(SnackBarStore.show).toHaveBeenCalledWith({
                barType: 'PLAYBOOK_ERROR',
            });
        });
    });

    describe('showBoRPostErrorSnackbar', () => {
        it('should show snackbar', () => {
            showBoRPostErrorSnackbar();

            expect(SnackBarStore.show).toHaveBeenCalledWith({
                barType: 'BOR_POST_EXPIRED',
            });
        });

        it('should show custom message when provided', () => {
            showBoRPostErrorSnackbar('custom message');

            expect(SnackBarStore.show).toHaveBeenCalledWith({
                barType: 'BOR_POST_EXPIRED',
                customMessage: 'custom message',
            });
        });
    });
});
