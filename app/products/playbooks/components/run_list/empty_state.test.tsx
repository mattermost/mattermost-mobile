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
        expect(getByText('No in progress runs')).toBeTruthy();
        expect(getByText('When a run starts in this channel, you’ll see it here.')).toBeTruthy();
    });

    it('renders finished empty state correctly', () => {
        const {getByText} = renderWithIntl(
            <EmptyState tab='finished'/>,
        );

        // Verify correct title and description are shown
        expect(getByText('No finished runs')).toBeTruthy();
        expect(getByText('When a run in this channel finishes, you’ll see it here.')).toBeTruthy();
    });
});
