// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import TabLayout from './_layout';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('expo-router', () => {
    const ReactActual = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    const Tabs = ({children}: {children: React.ReactNode}) => ReactActual.createElement(ReactActual.Fragment, null, children);
    Tabs.Screen = ({name}: {name: string}) => ReactActual.createElement(View, {testID: `home-tab.${name}`});
    return {Tabs};
});

describe('ENCMA home navigation', () => {
    it('keeps Channels and Account while hiding the other home destinations', () => {
        renderWithIntlAndTheme(<TabLayout/>);

        expect(screen.getByTestId(`home-tab.${Screens.CHANNEL_LIST}`)).toBeTruthy();
        expect(screen.getByTestId(`home-tab.${Screens.ACCOUNT}`)).toBeTruthy();
        expect(screen.queryByTestId(`home-tab.${Screens.SEARCH}`)).toBeNull();
        expect(screen.queryByTestId(`home-tab.${Screens.MENTIONS}`)).toBeNull();
        expect(screen.queryByTestId(`home-tab.${Screens.SAVED_MESSAGES}`)).toBeNull();
    });
});
