// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderWithIntl} from '@test/intl-test-helper';

import ErrorStateIcon from './error_state_icon';

describe('ErrorStateIcon', () => {
    it('renders correctly', () => {
        const {getByTestId} = renderWithIntl(<ErrorStateIcon/>);

        expect(getByTestId('error-state-icon')).toBeTruthy();
    });
});
