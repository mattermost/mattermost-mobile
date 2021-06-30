// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import * as PreferenceSelectors from '@mm-redux/selectors/entities/preferences';
import {renderWithReduxIntl} from 'test/testing_library';
import CustomStatusExpiry from './custom_status_expiry';

jest.mock('@mm-redux/selectors/entities/preferences');

describe('components/custom_status/custom_status_expiry', () => {
    const date = '2200-04-13T18:09:12.451Z';

    const baseProps = {
        theme: Preferences.THEMES.default,
        time: new Date(date),
    };

    (PreferenceSelectors.getBool as jest.Mock).mockReturnValue(false);
    it('should match snapshot', () => {
        const wrapper = renderWithReduxIntl(
            <CustomStatusExpiry
                {...baseProps}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
