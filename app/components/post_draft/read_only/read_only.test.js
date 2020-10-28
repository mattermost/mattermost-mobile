// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import {shallowWithIntl} from 'test/intl-test-helper';
import ReadOnly from './index';

describe('PostDraft ReadOnly', () => {
    test('Should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <ReadOnly
                theme={Preferences.THEMES.default}
            />,
        );

        expect(wrapper).toMatchSnapshot();
    });
});
