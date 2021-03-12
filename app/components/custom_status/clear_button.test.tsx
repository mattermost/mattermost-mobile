// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';
import Preferences from '@mm-redux/constants/preferences';
import CompassIcon from '@components/compass_icon';
import ClearButton from '@components/custom_status/clear_button';

describe('components/custom_status/custom_status_emoji', () => {
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

        wrapper.find(CompassIcon).simulate('press');
        expect(baseProps.handlePress).toBeCalled();
    });
});
