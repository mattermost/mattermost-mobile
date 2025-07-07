// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {showOverlay} from '@screens/navigation';

import {showPlaybookErrorSnackbar} from '.';

describe('snack bar', () => {
    describe('showPlaybookErrorSnackbar', () => {
        it('should show snackbar', () => {
            showPlaybookErrorSnackbar();

            expect(showOverlay).toHaveBeenCalledWith('SnackBar', {
                barType: 'PLAYBOOK_ERROR',
            });
        });
    });
});
