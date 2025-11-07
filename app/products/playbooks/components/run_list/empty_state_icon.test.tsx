// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderWithIntl} from '@test/intl-test-helper';

import EmptyStateIcon from './empty_state_icon';

describe('EmptyStateIcon', () => {
    it('renders correctly', () => {
        const {getByTestId} = renderWithIntl(<EmptyStateIcon/>);

        expect(getByTestId('empty-state-icon')).toBeTruthy();
    });
});
