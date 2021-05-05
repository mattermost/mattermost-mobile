// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';
import {TouchableOpacity} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import Preferences from '@mm-redux/constants/preferences';

describe('components/custom_status/clear_button', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        handlePress: jest.fn(),
    };

    it('should match snapshot', () => {
        const wrapper = shallow(
            <ClearButton
                {...baseProps}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should call handlePress when press event is fired', () => {
        const wrapper = shallow(
            <ClearButton
                {...baseProps}
            />,
        );

        wrapper.find(TouchableOpacity).simulate('press');
        expect(baseProps.handlePress).toBeCalled();
    });
});
