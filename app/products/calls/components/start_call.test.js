// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import StartCall from './start_call';

describe('StartCall', () => {
    const baseProps = {
        testID: 'test-id',
        theme: Preferences.THEMES.denim,
        currentChannelId: 'channel-id',
        joinCall: jest.fn(),
        canStartCall: true,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<StartCall {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should be null if you can not start a call', () => {
        const props = {...baseProps, canStartCall: false};
        const wrapper = shallow(<StartCall {...props}/>);

        expect(wrapper.getElement()).toBeNull();
    });
});
