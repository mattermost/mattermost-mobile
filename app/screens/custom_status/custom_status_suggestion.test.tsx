// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import Preferences from '@mm-redux/constants/preferences';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {shallow} from 'enzyme';
import {TouchableOpacity} from 'react-native';

describe('screens/custom_status_suggestion', () => {
    const baseProps = {
        handleSuggestionClick: jest.fn(),
        emoji: 'calendar',
        text: 'In a meeting',
        theme: Preferences.THEMES.default,
        separator: false,
    };

    it('should match snapshot', () => {
        const wrapper = shallow(
            <CustomStatusSuggestion
                {...baseProps}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should match snapshot with separator and clear button', () => {
        const wrapper = shallow(
            <CustomStatusSuggestion
                {...baseProps}
                separator={true}
                handleClear={jest.fn()}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should call handleSuggestionClick on clicking the suggestion', () => {
        const wrapper = shallow(
            <CustomStatusSuggestion
                {...baseProps}
            />,
        );

        wrapper.find(TouchableOpacity).simulate('press');
        expect(baseProps.handleSuggestionClick).toBeCalled();
    });
});
