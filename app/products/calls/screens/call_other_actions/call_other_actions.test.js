// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import {shallowWithIntl} from '@test/intl-test-helper';

import CallOtherActions from './call_other_actions';

describe('CallOtherActions', () => {
    const baseProps = {
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<CallOtherActions {...baseProps}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
