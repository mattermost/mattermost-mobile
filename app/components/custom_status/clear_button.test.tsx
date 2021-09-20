// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ClearButton from '@components/custom_status/clear_button';
import Preferences from '@constants/preferences';
import {fireEvent, render} from '@test/intl-test-helper';

describe('components/custom_status/clear_button', () => {
    const baseProps = {
        handlePress: jest.fn(),
        testID: 'clear_custom_status.button',
        theme: Preferences.THEMES.denim,
    };

    it('should match snapshot', () => {
        const wrapper = render(
            <ClearButton
                {...baseProps}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should call handlePress when press event is fired', () => {
        const {getByTestId} = render(
            <ClearButton
                {...baseProps}
            />,
        );

        fireEvent.press(getByTestId(baseProps.testID));
        expect(baseProps.handlePress).toBeCalled();
    });
});
