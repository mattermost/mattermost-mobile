// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import ChannelLoader from './channel_loader';

describe('ChannelLoader', () => {
    const baseProps = {
        channelIsLoading: true,
        theme: Preferences.THEMES.default,
        retryLoad: jest.fn(),
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<ChannelLoader {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call setTimeout and setInterval for showIndicator and retryLoad on mount', () => {
        jest.useFakeTimers();

        const wrapper = shallow(<ChannelLoader {...baseProps}/>);
        const instance = wrapper.instance();

        expect(setTimeout).toHaveBeenCalledWith(instance.showIndicator, 10000);
        expect(setInterval).toHaveBeenCalledWith(baseProps.retryLoad, 10000);
    });

    test('should clear timer and interval on unmount', () => {
        jest.useFakeTimers();

        const wrapper = shallow(<ChannelLoader {...baseProps}/>);
        const instance = wrapper.instance();
        instance.componentWillUnmount();

        expect(clearTimeout).toHaveBeenCalledWith(instance.stillLoadingTimeout);
        expect(clearInterval).toHaveBeenCalledWith(instance.retryLoadInterval);
    });
});
