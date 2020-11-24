// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import ChannelNavBar from './channel_nav_bar';

import {SafeAreaProvider} from 'react-native-safe-area-context';
export function testSafeAreaProvider(children) {
    return (
        <SafeAreaProvider
            initialMetrics={{
                frame: {x: 0, y: 0, width: 0, height: 0},
                insets: {top: 0, left: 0, right: 0, bottom: 0},
            }}
        >
            {children}
        </SafeAreaProvider>
    );
}

jest.mock('react-intl');
jest.mock('app/mattermost_managed', () => ({
    isRunningInSplitView: jest.fn().mockResolvedValue(false),
}));

describe('ChannelNavBar', () => {
    const baseProps = {
        isLandscape: false,
        openMainSidebar: jest.fn(),
        openSettingsSidebar: jest.fn(),
        onPress: jest.fn(),
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(testSafeAreaProvider(
            <ChannelNavBar {...baseProps}/>,
        ));

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
