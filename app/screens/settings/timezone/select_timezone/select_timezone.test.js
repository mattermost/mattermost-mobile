// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';

import SelectTimezone from './select_timezone';

describe('Settings SelectTimezone', () => {
    const baseProps = {
        onBack: jest.fn(),
        selectedTimezone: 'selected-timezone',
        initialScrollIndex: 1,
        timezones: [],
        theme: Preferences.THEMES.default,
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<SelectTimezone {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
