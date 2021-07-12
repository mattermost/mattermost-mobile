// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import Preferences from '@constants/preferences';
import {renderWithIntl} from '@test/intl-test-helper';

import ChannelNavBar from './index';

export function testSafeAreaProvider(children: ReactNode) {
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
        const wrapper = renderWithIntl(testSafeAreaProvider(
            <ChannelNavBar {...baseProps}/>,
        ));

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
