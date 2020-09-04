// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import {renderWithIntl} from 'test/testing_library';

import ReadOnly from './index';

describe('PostDraft ReadOnly', () => {
    test('Should match snapshot', () => {
        const wrapper = renderWithIntl(
            <ReadOnly
                theme={Preferences.THEMES.default}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
