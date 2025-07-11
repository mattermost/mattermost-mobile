// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ErrorState from './error_state';
import ErrorStateIcon from './error_state_icon';

jest.mock('./error_state_icon');
jest.mocked(ErrorStateIcon).mockImplementation(
    () => React.createElement('ErrorStateIcon', {testID: 'error-state-icon'}),
);

describe('ErrorState', () => {
    it('renders error state correctly', () => {
        const {getByText} = renderWithIntl(<ErrorState/>);

        expect(getByText('Unable to fetch run details')).toBeTruthy();
        expect(getByText('Please check your network connection or try again later.')).toBeTruthy();
    });

    it('renders error state icon', () => {
        const {getByTestId} = renderWithIntl(<ErrorState/>);

        expect(getByTestId('error-state-icon')).toBeTruthy();
    });
});
