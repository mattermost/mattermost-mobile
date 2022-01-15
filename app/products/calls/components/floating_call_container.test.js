// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {Text} from 'react-native';

import FloatingCallContainer from './floating_call_container';

describe('FloatingCallContainer', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(<FloatingCallContainer><Text>{'test'}</Text></FloatingCallContainer>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
