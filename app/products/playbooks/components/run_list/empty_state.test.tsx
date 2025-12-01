// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderWithIntl} from '@test/intl-test-helper';

import EmptyState from './empty_state';

describe('EmptyState', () => {
    it('renders in-progress empty state correctly', () => {
        const {getByText} = renderWithIntl(
            <EmptyState tab='in-progress'/>,
        );

        // Verify correct title and description are shown
        expect(getByText('Nothing in progress')).toBeTruthy();
        expect(getByText('When a checklist starts in this channel, you’ll see it here.')).toBeTruthy();
    });

    it('renders finished empty state correctly', () => {
        const {getByText} = renderWithIntl(
            <EmptyState tab='finished'/>,
        );

        // Verify correct title and description are shown
        expect(getByText('Nothing finished')).toBeTruthy();
        expect(getByText('When a checklist in this channel finishes, you’ll see it here.')).toBeTruthy();
    });
});
