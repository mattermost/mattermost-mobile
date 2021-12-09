// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';
import {CustomStatusDuration} from '@mm-redux/types/users';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {shallowWithIntl} from '@test/intl-test-helper';

describe('screens/custom_status_suggestion', () => {
    const baseProps = {
        handleSuggestionClick: jest.fn(),
        emoji: 'calendar',
        text: 'In a meeting',
        theme: Preferences.THEMES.denim,
        separator: false,
        duration: CustomStatusDuration.DONT_CLEAR,
    };

    it('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <CustomStatusSuggestion
                {...baseProps}
            />,
        );

        expect(wrapper.dive().getElement()).toMatchSnapshot();
    });

    it('should match snapshot with separator and clear button', () => {
        const wrapper = shallowWithIntl(
            <CustomStatusSuggestion
                {...baseProps}
                separator={true}
                handleClear={jest.fn()}
            />,
        );

        expect(wrapper.dive().getElement()).toMatchSnapshot();
    });

    it('should call handleSuggestionClick on clicking the suggestion', () => {
        const wrapper = shallowWithIntl(
            <CustomStatusSuggestion
                {...baseProps}
            />,
        );

        wrapper.dive().find(TouchableOpacity).simulate('press');
        expect(baseProps.handleSuggestionClick).toBeCalled();
    });
});
