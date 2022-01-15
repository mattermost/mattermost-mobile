// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import EnableDisableCalls from './enable_disable_calls';

describe('EnableDisableCalls', () => {
    const baseProps = {
        testID: 'test-id',
        theme: Preferences.THEMES.denim,
        onPress: jest.fn(),
        canEnableDisableCalls: true,
        enabled: false,
    };

    test('should match snapshot if calls are disabled', () => {
        const wrapper = shallow(<EnableDisableCalls {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot if calls are enabled', () => {
        const props = {...baseProps, enabled: true};
        const wrapper = shallow(<EnableDisableCalls {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should be null if you can not enable/disable calls', () => {
        const props = {...baseProps, canEnableDisableCalls: false};
        const wrapper = shallow(<EnableDisableCalls {...props}/>);

        expect(wrapper.getElement()).toBeNull();
    });
});
