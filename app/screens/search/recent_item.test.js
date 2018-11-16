// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import RecentItem from './recent_item';

describe('Search RecentItem', () => {
    const item = {
        terms: 'test',
    };

    const baseProps = {
        item,
        removeSearchTerms: jest.fn(),
        setRecentValue: jest.fn(),
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot and respond to events', () => {
        const wrapper = shallow(
            <RecentItem {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        wrapper.find('TouchableHighlight').first().props().onPress();
        expect(baseProps.setRecentValue).toHaveBeenCalledTimes(1);
        expect(baseProps.setRecentValue).toHaveBeenCalledWith(item);
        wrapper.find('TouchableOpacity').first().props().onPress();
        expect(baseProps.setRecentValue).toHaveBeenCalledTimes(1);
        expect(baseProps.setRecentValue).toHaveBeenCalledWith(item);
    });
});
